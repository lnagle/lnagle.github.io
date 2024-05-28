---
title: 'Debugging a Deadlock: A Case Study'
---
	
I ran into a deadlock issue recently with a Postgres-backed service I built. This post is a breakdown of how I diagnosed the root cause and fixed it.

The purpose of the service is to tell members what healthy activities they can do for the day, and each day’s activities are personalized for a given member. The simplified database schema looks like this:

```
CREATE TABLE things_to_do (
  user_id UUID,
  activity_name TEXT,
  PRIMARY KEY (user_id, activity_name),
  sort_order INT
);
```

The idea behind `sort_order` is that the user’s results for the day will be cached; it would be a jarring experience if the service told you to do x, y, and z, but when you logged back on later in the day it told you to do z, x, and y or even a, b, and c. 

The service ran a few different queries against the DB:
1. get the user’s things to do for the day (a select)
2. cache the user’s things to do for the day (a batch upsert)
3. get the user’s cached things to do for the day (a select)
4. update the status of a given things to do for a user (a single upsert)
5. get all of the ‘getting started’ activities, in a default order (a select)

When I first started seeing `Deadlock detected` errors in the logs, it wasn’t clear to me which query or combination of queries was causing the issue. I beefed up the logs, making it clearer what query was failing due to deadlock.

The query that kept showing up in the logs as failing as #3. That doesn’t necessarily mean that it’s the problematic query. Deadlocks are resolved (1 transaction is aborted, and 1 therefore allowed to resolve) by PG in a non-deterministic way. This means that one of the other queries AND query #3 could’ve been causing the deadlock, but only #3 happened to fail. What made me more sure that #3 was the sole culprit was having enough logs of the issue pointing at #3 to make the likelihood that another query was involved small. This is a minor, almost academic detail in this case, but I think it’s important to call out; oftentimes, when debugging, it’s important to question every assumption at least a little.

Anyway, onto the query itself. As mentioned above, it’s s a batch upsert that’s intended to cache the `things_to_do` chosen by the service’s algorithm for the user for that day. The query looked something like this:

```
INSERT INTO things_to_do (user_id, activity_name, sortOrder) VALUES (‘123’, ‘short-walk’, 1), (‘123’, ‘grocery-list’, 2), (‘123’, ‘stretch-break’, 3);
```

Note that:
1. all of the values have the same `user_id` (the first half of the primary key)
2. each of the values have a  different `activity_name` (the second half of the primary key)
3. the values are inserted in the order of `sort_order`

Unfortunately, there still wasn’t enough information at this point to determine the root cause of the issue. From my vantage, there wasn’t any way that these queries could interact poorly with one another. The primary reasons I thought this is because all of the operations happen with a specific `user_id`, and there didn’t seem to be a way for a user to kick off two requests back-to-back fast enough to cause a deadlock. And yet, that’s what seemed to be happening. So how to get more information? More logging, of course.

I decided to do a few things:
1. log whenever the query was about to run
2. log whenever the query was successful
3. log the `activity_name`s the query was run with (whether successful or failed), in the order that the algorithm chose

With these additions, I waited and watched. When a deadlock did occur again, the results were surprising in two ways. First, back-to-back requests that triggered the problematic query were being made the to the service (‘back-to-back’ meaning separated by around hundreds of milliseconds, in this case). This was exactly what I conjectured could not happen! Second, when there was a deadlock it appeared that the order of the `activity_name`s between the two requests were different. 

This first issue is beyond the scope of this blog post, as it seems to originate on the client-side of the system, which I’m not directly familiar with. In addition, unexpected behavior or a bug on the client side should be manageable by the backend service and/or DB. In other words, the deadlock-able query should be fixed either way.

The second issue was even more striking. When I said at the top of this post that the algorithm personalizes the user’s things to do for the day, that wasn’t quite right. That is what I thought when I first started investigating this issue. But I had written this application over a year ago, and I had forgotten that for established users, the algorithm falls back to randomizing activities the member should see from day-to-day. Once the algorithm runs once for the day, those results should be cached in the DB (hence the `sort_order` column), but the results of that first run are not deterministic. 

And so I was seeing log output that looked like this:
```
- Upsert: (123, ‘short-walk’, 1), (123, ‘grocery-list’, 2) - Starting
- Upsert: (123, ‘grocery-list’, 1), (123, ‘short-walk’, 2) - Starting
- Upsert: (123, ‘short-walk’, 1), (123, ‘grocery-list’, 2) - Failed - Deadlock detected
- Upsert: (123, ‘grocery-list’, 1), (123, ‘short-walk’, 2) - Successful
```

I was able to replicate this behavior on a local instance of PG with the same schema by opening 2 psql connections in separate iTerm tabs and using broadcast mode (CMD + SHIFT + i) to simultaneously execute the following query which randomly chooses an order to upsert.

```
INSERT INTO things_to_do (user_id, activity_name, sort_order)
	SELECT * FROM (
		VALUES ('123', 'short-walk', 1), ('123', 'grocery-list', 2)
	) as v 
	ORDER BY RANDOM()
ON CONFLICT (user_id, activity_name) DO UPDATE SET sort_order = EXCLUDED.sort_order;
```

This was a bit of a caveman approach, but it sufficed.

So with the root cause identified, the question was: how to fix it? The [PG docs](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS) shed some light: provide a consistent order to the upserts. Very straightforward, thankfully. On the application side, after determining the order of activities the users should see for the day and assigning `sort_order` to the query params, the params are then resorted specifically for the query. `sort_order` does not change, but with the `activity_name`s alphabetized, a deadlock will not occur. This was born out by retesting the query above without the `ORDER BY RANDOM()` and by a refreshing lack of `Deadlock detected` errors in the logs.

What conclusions should be drawn from this case study. Several came to mind for me:
1. It’s important to recognize when productive reasoning about a system and its usage patterns bleeds over into unproductive conjecturing about the issue. I could’ve solved this faster if I had been more conscientious about limiting the latter and instead gathering concrete information.
2. Building on #2, logging is indispensable. This means having logs, ease of adding logs, and having tooling for analyzing logs. Without this, I would’ve been left grasping at straws.
3. The deadlock section of the Postgres docs is characteristically terse and just as characteristically reliable. Although I was working with batch upserts and a composite primary key, the fundamental issue and solution were still present. For me, this was a great reminder to slow down and be focused when consulting docs and similar resources.
---
title: 'Know Your JS: 2D Matrix Creation'
---

Recenly I was working through a problem on LeetCode that required the creation of an X-by-X racetrack. The input would direct a car through a series of moves around the racetrack, printing the board with each movement. Simple enough?

I created my matrix- in this case 4x4- and set my car’s starting position:

```
const raceTrack = Array(4).fill(Array(4).fill(0));
raceTrack[1][2] = 1;
```

I happily clacked away at my keyboard, implementing the rest of the solution with little suspicion that I had introduced a bug in my very first line of code. When I went to print the initial board, this is what I saw:

```
0010
0010
0010
0010
```

If you’ve been in the JS world for any length of time you're probably not surprised by this output. The error I had made- a classic error, really- was confusing pass by reference for pass by value. The MDN docs for `.fill()` make this perfectly clear:

```
When fill gets passed an object, it will copy the reference and fill the array with references to that object.
```

Let’s break it down:

The initial `Array(4)` creates an array with 4 empty items. It’s then filled with the result of Array(4).fill(0). But what exactly is `Array(4).fill(0)`? It’s a single array, passed by reference to each of the four empty spaces in the first `Array(4)`. Therefore, when I went to update the racetrack with the racer and then log the result, what was displayed was not a two dimensional array containing four different arrays, but a two dimensional array containing four representations of the same, now updated array.

All unwell and bad. So then how to fix it?

`Array(4).fill(0).map(() => Array(4).fill(0));`

By filling the first array with zeroes and then mapping each to the result of a callback that returns `Array(4).fill(0)` we are given a brand new array with each iteration. After updating the initial code, everything works as intended:

```
const raceTrack = Array(4).fill(0).map(() => Array(4).fill(0));
raceTrack[1][2] = 1;

printTrack(raceTrack);
/*
0000
0010
0000
0000
*/
```

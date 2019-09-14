---
title: 'Backpressure in Node Streams: A Conceptual Overview'
---

*This post assumes a basic understanding of Node streams. If you aren’t already familiar with streams, there are a plethora of great resources for learning about them. I personally recommend Substack's [Stream Handbook](https://github.com/substack/stream-handbook).*


## What is backpressure?

When one stream pushes data to another stream faster than the latter can process it causes excess data to be read into memory, creating a vicious cycle wherein the garbarge collector has to sift through more data to determine what can be cleaned up, slowing down the actual processing of data, and then writing even more data into memory as the preceding stream continues to push. In addition to the aforementioned excess memory consumption and strain on the garbage collector, this will also cause a general slow down of other processes. Backpressure is a way of mitigating and managing this problem.

What does it look like when backpressure is applied and everything works correctly?


## Standard interaction between Node streams

Node streams have a basic workflow for situations that require backpressure. If you're using `.pipe()`, this workflow is already taken care of for you. The steps are as follows:

*For the sake of this example, I'm assuming a simple Readable-to-Writable stream setup.*

1. `R` is a readable stream and `W` is a writable stream. `R` begins reading from a data source and passes chunks of data into `W.write()`.
2. `W` begins writing the data received from `R`.
3. Due to either `W`'s [highWaterMark](https://nodejs.org/api/stream.html#stream_buffering) being reached or the write queue being busy, `W.write()` returns `false`.
4. `R` receives `false` and in response it calls `R.pause()` to prevent more data from being pushed to `W`.
5. `W` finishes writing its current chunk of data. It now emits a `drain` event to signal that it is ready to process another chunk.
6. In response to the `drain` event, `R.resume()` is called and more data begins to flow into `W`.


## Cardinal rules for building custom streams

As already mentioned, `.pipe()` handles the above steps right out of the box. If you're building custom streams, however, you'll need to implement backpressure mechanisms yourself. Keeping in mind two rules will make this easier:

1. For Writable streams, always return `false` if either the `highWaterMark` has been met or the write queue is already in use.

2. For Readable streams, do not ignore the return value of `Writable.write()` and therefore fail to call `Readable.pause()` when Writeable is not yet ready for more data. Put more succinctly, do not call `Writeable.write()` or `Readable.push()` unconditionally.


## Conclusion

Node provides a great deal of convenience and abstraction, allowing developers to get their projects up and running quickly. Although it's easy to get far with the basics alone, it's also important to now and then peak under the hood and gain a deeper knowledge of how things run. Hopefully this post has given you an understanding of backpressure, what problem it seeks to solve, how it's handled in Node, and how to leverage the same logic when building custom streams.


## Additional Reading

- https://nodejs.org/api/stream.html
- https://nodejs.org/en/docs/guides/backpressuring-in-streams/
- https://www.bennadel.com/blog/3237-managing-stream-back-pressure-during-asynchronous-tasks-using-readable-and-data-events-in-node-js.htm
- http://ey3ball.github.io/posts/2014/07/17/node-streams-back-pressure/

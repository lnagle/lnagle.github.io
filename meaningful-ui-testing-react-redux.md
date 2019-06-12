---
title: Meaningful UI Testing in React/Redux Apps
---

This write-up came out of experiences building a financial advisor dashboard application at Ameriprise. My team and I originally went the route of snapshot testing most of our components, but we ended up tearing those tests out some months later when it had become apparent just how little value they were adding. Since then, we've shifted our testing approach to the one outlined below and it's proven far more useful.


### Problem: Snapshot testing for UIs has proven ineffectual, arguably detrimental

- Snapshot testing does not give a clear and concise idea of what has broken
- Snapshot tests are fragile, often breaking for illegitimate reasons
- It is both too easy and too tempting to update breaking snapshots. This can be done impulsively, without giving real consideration to whether or not a bug has been created or fixed
- Snapshot tests give a false sense of security by quickly delivering a high amount of test coverage to a codebase

---

### Solution: A combination of unit and integration UI tests

Instead of snapshot testing components:
- Test statements of business logic. Example: 'When the user clicks the button, a modal should be shown'
- Test cross-component concerns. Example: 'When the user clicks the button on component A, component B should turn blue'
- Test bugs as they are found and fixed. Example bug: 'The user is able to see and click the 'submit' button on component C even if they haven't finished filling out the form.  The button should instead remain disabled until the form is fully filled out'

An important clarification: Integration in this sense is integration of different application-level components (Ex: component A and component B). It is *not* integration of different applications (Ex: frontend application A and backend API A). The latter case is descriptive of an end-to-end (E2E) test.

---

### What this solution will allow developers to do

- Write robust, targeted UI tests based on things the user sees and interacts with
- Be confident that code has not broken after making changes
- If desired, write code using a Test-Driven Development (TDD) approach

---

### `react-testing-library`

`react-testing-library` has emerged as a reliable, thoughtfully-designed library for unit and integration UI testing alongside `jest`. Advantages of `react-testing-library` include:

- Lightweight
- Opinionated; it guides developers towards good testing patterns and away from bad ones
- Supports the `querySelector` API in cases where its DOM traversal abstractions are too light. More info: https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector
- Terrific documentation with many examples
- Easily supports testing components connected to a `redux` store, as well as those that are not

---

### `react-testing-library` resources

Guiding Principles: https://testing-library.com/docs/guiding-principles

Installation: https://testing-library.com/docs/react-testing-library/intro

Examples:
- https://testing-library.com/docs/example-react-redux
- https://testing-library.com/docs/react-testing-library/example-intro

API Documentation: https://testing-library.com/docs/react-testing-library/api

---

### Laying the foundation for integration testing in `react`/`redux` applications

In `react`/`redux` applications, the integration of components often happens at the state layer (the `redux` store). It is therefore necessary to create a store when writing integration tests.  This is easily done with `react-testing-library`, which provides an example of creating a test scaffold function here: https://testing-library.com/docs/react-testing-library/setup#custom-render

An essential note about the test scaffold: Tests should be designed to not affect one another, which means that each test that uses the test scaffold will need a new or cleared store. It is less error-prone to define a function that creates a new store than a function that clears an already made store. **In an existing application, if the store is designed as a singleton, it will need to be converted to a factory function.** More info about these two patterns below:

Example of a store.ts file that exports a singleton:

```
import { createStore } from 'redux';

// Only one store is ever created- tests will be 'leaky'
const store = createStore(
  // reducer
)

export store;
```


Example of a store.ts file that exports a factory function:

```
import { createStore } from 'redux';

// This function creates and returns a new store each time it is called
// Tests will be isolated from each other at the state layer
export const generateStore = () => {
  const store = createStore(
    // reducer
  )

  return store;
}
```

---

### A few notes

##### 1. Test overlap between unit and integration style tests

When writing both unit and integration tests within a codebase, it is highly likely that tests will cover the same functionality more than once. At first glance, this may seem wasteful and unnecessary. It is important to remember a few things:

1. Unit tests will cover the more granular functionality of a codebase. These should be more numerous, both because of the scale of what they're testing, as well as the low overhead involved in writing them. Most of these tests will involve little to no TSX, and will instead be utility functions, algorithms, mapping functions, etc.
2. Integration testing is primarily concerned with the ways in which two or more components interact with one another. Much of the complexity of any app is in this cross-component domain, and it is essential that testing be done here as well as at the level of the individual component or function.
3. In cases in which both unit tests and integration tests break, the unit tests will likely give a more finely tuned sense of what and where the problem is. Integration tests involve more lines of code across more files, and will therefore be harder to debug when they break. Fixing unit tests first might mean that the integration test gets fixed too, but, if it doesn't, it at least gives a clear idea of what is not causing the test to fail.

More info: https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html

##### 2. Test coverage

Although test coverage can be a useful metric for code robustness, it is also easy to gain a false sense of security from it (coverage from snapshot testing provides a great example of this). It is therefore imperative that code coverage be seen as a supplementary measurement of code quality. When writing tests, the goal should be to test individual statements of business logic or specific bug cases, rather than simply exercising all lines of code.

<div align="center">

<img src="./assets/logo.svg" alt="dnseval logo" width="70px">

# dns/eval

</div>

Tool to check which DNS resolvers are the fastest by testing their latency against some of the most popular websites. To run, clone this repo and run `bun install`, then `bun run start`.

The test might take a while since it does 200 tests for each website by default. You can adjust the speed and accuracy of the results by modifying the `SAMPLES_PER_HOST` constant in the `index.js` file.

***

This project was created using `bun init` in bun v1.2.1. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
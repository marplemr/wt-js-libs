# Winding Tree Javascript Libraries for Hotels

A JS interface to WindingTree's Ethereum smart-contracts for Hotels.

## Installation

```sh
npm install @windingtree/wt-js-libs
# or
git clone https://github.com/windingtree/wt-js-libs
nvm install
npm install
```

## Usage

See `test/usage.spec.js` file. The public interface of this library
should always be the same regardless which implementation is used
under the hood.

```javascript
# Fully locally json backed Winding Tree
const libs = WTLibs.createInstance({
  dataModelType: 'full-json',
  dataModelOptions: { source: {'some-local-index': {... JSON source ...}}}
});
const index = await libs.getWTIndex('some-local-index');
const hotel = await index.getHotel('some-address');

# Winding Tree backed by a local Ethereum node and in-memory JSON storage
# You need to deploy the index and the hotel first. See test/utils/migrations
for inspiration.

const libs = WTLibs.createInstance({
  dataModelType: 'web3-json',
  dataModelOptions: {
    provider: 'http://localhost:8545',
    initialJsonData: {
      'hotel-url-1': {... some data ...} // hotel-url-1 is url saved on-chain in a hotel
    },
  }
});
const index = await libs.getWTIndex('0x...');
const hotel = await index.getHotel('0x...');

# ... more to come

```

## Documentation

The current documentation can be rendered by running `npm run docs`

## Test

To run unit tests, run `npm test`. Some tests are run multiple times
against different implementations.


```sh
npm test
```


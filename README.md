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

For more examples, see `test/usage.spec.js` file. The public interface of this library
should always be the same regardless which implementation is used
under the hood.

```javascript
// Winding Tree backed by a local Ethereum node.
// You need to deploy the index and the hotel first. See test/utils/migrations
for inspiration.

const libs = WTLibs.createInstance({
  dataModelOptions: {
    provider: 'http://localhost:8545',
  }
});
const index = await libs.getWTIndex('0x...');
const hotel = await index.getHotel('0x...');
// Accessing off-chain data - url is actually stored on chain
const hotelDescriptionUrl = await (await hotel.dataIndex).ref;
// This data is fetched from some off-chain storage
const hotelDescription = await (await hotel.dataIndex).contents.description;
const hotelName = await hotelDescription.contents.name;
```

## Documentation

The current documentation can be rendered by running `npm run docs`

## Test

To run unit tests, run `npm test`.

const { assert } = require('chai');

const utils = require('../src/utils/index');

describe('Parameters validators', function () {
  describe('Booking data validators', function () {
    describe('addressAndRange', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c8';
      const unitAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      it('validate addressAndRange: Expect OK.', async () => {
        try {
          await utils.validate.addressAndRange({ hotelAddress, unitAddress, fromDate, daysAmount });
        } catch (err) {
          assert.isNull(err);
        }
      });

      it('validate addressAndRange: Expect error.', async () => {
        try {
          await utils.validate.addressAndRange({ fromDate, daysAmount });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('addressAndDate', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c8';
      const unitAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const date = new Date('10/10/2020');
      it('validate addressAndDate: Expect OK.', async () => {
        try {
          await utils.validate.addressAndDate({ hotelAddress, unitAddress, date });
        } catch (err) {
          assert.isNull(err);
        }
      });

      it('validate addressAndDate: Expect error.', async () => {
        try {
          await utils.validate.addressAndDate({ date });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('addressesAndBlock', function () {
      const _addresses = [
        '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7',
        '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c8'];
      const fromBlock = 3;
      it('validate addressesAndBlock: Expect OK.', async () => {
        try {
          await utils.validate.addressesAndBlock({ _addresses, fromBlock });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate addressesAndBlock with single address: Expect OK.', async () => {
        const _addresses = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
        try {
          await utils.validate.addressesAndBlock({ _addresses, fromBlock });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate addressesAndBlock: Expect error.', async () => {
        try {
          await utils.validate.addressesAndBlock({ fromBlock });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('addresses', function () {
      const _addresses = [
        '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7',
        '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c8'];
      it('validate addresses: Expect OK.', async () => {
        try {
          await utils.validate.addresses({ _addresses });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate addressesAndBlock: Expect error.', async () => {
        try {
          await utils.validate.addresses({});
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
  });

  describe('User validators', function () {
    describe('bookInfo', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const fromDate = new Date('10/10/2020');
      const daysAmount = 5;
      const guestData = 'guestData';
      it('validate bookInfo: Expect OK.', async () => {
        try {
          await utils.validate.bookInfo({ hotelAddress, unitAddress, fromDate, daysAmount, guestData });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate bookInfo: Expect error.', async () => {
        try {
          await utils.validate.bookInfo({ unitAddress, fromDate, daysAmount, guestData });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('cost', function () {
      it('validate bookInfo: Expect OK.', async () => {
        try {
          await utils.validate.cost({ cost: '53' });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate bookInfo: Expect error.', async () => {
        try {
          await utils.validate.bookInfo({ cost: 'bad' });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
  });

  describe('hotel manager', function () {
    describe('cost', function () {
      it('validate bookInfo: Expect OK.', async () => {
        try {
          await utils.validate.cost({ cost: '53' });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate bookInfo: Expect error.', async () => {
        try {
          await utils.validate.bookInfo({ cost: 'bad' });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('addressAndDay', function () {
      const unitAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      it('validate addressAndDay: Expect ok.', async () => {
        try {
          await utils.validate.addressAndDay({ unitAddress, day: '1596' });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate addressAndDay: Expect ok.', async () => {
        try {
          await utils.validate.addressAndDay({ unitAddress, day: new Date('10/10/2020') });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
      it('validate addressAndDay: Expect err.', async () => {
        try {
          await utils.validate.addressAndDay({ unitAddress });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('nameAndDescription', function () {
      const name = 'WTHotel';
      const description = 'Winding Tree Hotel';
      it('validate nameAndDescription: Expect OK.', async () => {
        try {
          await utils.validate.nameAndDescription({ name, description });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate nameAndDescription: Expect error.', async () => {
        try {
          await utils.validate.nameAndDescription({ name });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('hotelAddressAndValue', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const value = true;
      it('validate hotelAddressAndValue: Expect OK.', async () => {
        try {
          await utils.validate.hotelAddressAndValue({ hotelAddress, value });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate hotelAddressAndValue: Expect error.', async () => {
        try {
          await utils.validate.hotelAddressAndValue({ hotelAddress });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('physicalAddress', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const lineOne = 'Address line one';
      const lineTwo = 'Address line two';
      const zipCode = 'C1414';
      const country = 'Argentina';
      it('validate physicalAddress: Expect OK.', async () => {
        try {
          await utils.validate.physicalAddress({ hotelAddress, lineOne, lineTwo, zipCode, country });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate physicalAddress: Expect error.', async () => {
        try {
          await utils.validate.physicalAddress({ lineOne, lineTwo, zipCode, country });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('hotelCoordinatesAndTimezone', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const timezone = 'Europe/London';
      const longitude = 50;
      const latitude = 15;
      it('validate hotelCoordinatesAndTimezone: Expect OK.', async () => {
        try {
          await utils.validate.hotelCoordinatesAndTimezone({ hotelAddress, timezone, latitude, longitude });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate hotelCoordinatesAndTimezone: Expect error.', async () => {
        try {
          await utils.validate.hotelCoordinatesAndTimezone({ timezone, latitude, longitude });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('hotelAddressAndUrl', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const url = 'picture.jpg';
      it('validate hotelAddressAndUrl: Expect OK.', async () => {
        try {
          await utils.validate.hotelAddressAndUrl({ hotelAddress, url });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate hotelAddressAndUrl: Expect error.', async () => {
        try {
          await utils.validate.hotelAddressAndUrl({ url });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('hotelAddressAndImageIndex', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const imageIndex = 1;
      it('validate hotelAddressAndImageIndex: Expect OK.', async () => {
        try {
          await utils.validate.hotelAddressAndImageIndex({ hotelAddress, imageIndex });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate hotelAddressAndUrl: Expect error.', async () => {
        try {
          await utils.validate.hotelAddressAndImageIndex({ imageIndex });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('hotelAddressAndreservationId', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const reservationId = 'ID_1';
      it('validate hotelAddressAndreservationId: Expect OK.', async () => {
        try {
          await utils.validate.hotelAddressAndreservationId({ hotelAddress, reservationId });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate hotelAddressAndreservationId: Expect error.', async () => {
        try {
          await utils.validate.hotelAddressAndreservationId({ reservationId });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('hotelAddressAndUnitType', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitType = 'BASIC_ROOM';
      it('validate hotelAddressAndUnitType: Expect OK.', async () => {
        try {
          await utils.validate.hotelAddressAndUnitType({ hotelAddress, unitType });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate hotelAddressAndUnitType: Expect error.', async () => {
        try {
          await utils.validate.hotelAddressAndUnitType({ unitType });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('hotelAddressAndUnitType', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitType = 'BASIC_ROOM';
      const amenity = 22;
      it('validate hotelAddressAndUnitType: Expect OK.', async () => {
        try {
          await utils.validate.unitTypeAmenity({ hotelAddress, unitType, amenity });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate hotelAddressAndUnitType: Expect error.', async () => {
        try {
          await utils.validate.unitTypeAmenity({ unitType, amenity });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('addImageUnitType', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitType = 'BASIC_ROOM';
      const url = 'picture.jpg';
      it('validate addImageUnitType: Expect OK.', async () => {
        try {
          await utils.validate.addImageUnitType({ hotelAddress, unitType, url });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate addImageUnitType: Expect error.', async () => {
        try {
          await utils.validate.addImageUnitType({ unitType, url });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('removeImageUnitType', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitType = 'BASIC_ROOM';
      const imageIndex = 0;
      it('validate addImageUnitType: Expect OK.', async () => {
        try {
          await utils.validate.removeImageUnitType({ hotelAddress, unitType, imageIndex });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate addImageUnitType: Expect error.', async () => {
        try {
          await utils.validate.removeImageUnitType({ unitType, imageIndex });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('hotelAddressAndUnitAddress', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c9';
      it('validate hotelAddressAndUnitAddress: Expect OK.', async () => {
        try {
          await utils.validate.hotelAddressAndUnitAddress({ hotelAddress, unitAddress });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate hotelAddressAndUnitAddress: Expect error.', async () => {
        try {
          await utils.validate.hotelAddressAndUnitAddress({ hotelAddress });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });

    describe('unitActive', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c9';
      const active = true;
      it('validate unitActive: Expect OK.', async () => {
        try {
          await utils.validate.unitActive({ hotelAddress, unitAddress, active });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate unitActive: Expect error.', async () => {
        try {
          await utils.validate.unitActive({ hotelAddress, unitAddress });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('unitTypePrice', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitType = 'BASIC_ROOM';
      const price = 22;
      it('validate unitTypePrice: Expect OK.', async () => {
        try {
          await utils.validate.unitTypePrice({ hotelAddress, unitType, price });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate unitTypePrice: Expect error.', async () => {
        try {
          await utils.validate.unitTypePrice({ hotelAddress, unitType });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('unitTypeLifPrice', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitType = 'BASIC_ROOM';
      const price = '22';
      it('validate unitTypeLifPrice: Expect OK.', async () => {
        try {
          await utils.validate.unitTypeLifPrice({ hotelAddress, unitType, price });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate unitTypeLifPrice: Expect error.', async () => {
        try {
          await utils.validate.unitLifPrice({ hotelAddress, unitType });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });

    describe('currencyCode', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitType = 'BASIC_ROOM';
      const code = 948;
      it('validate currencyCode: Expect OK.', async () => {
        try {
          await utils.validate.currencyCode({ hotelAddress, unitType, code });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate currencyCode: Expect error.', async () => {
        try {
          await utils.validate.currencyCode({ hotelAddress, unitType });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });

    describe('unitSpecialPrice', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c9';
      const price = 22;
      const fromDate = new Date('10/10/2020');
      const daysAmount = 3;
      it('validate unitSpecialPrice: Expect OK.', async () => {
        try {
          await utils.validate.unitSpecialPrice({ hotelAddress, unitAddress, price, fromDate, daysAmount });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate unitSpecialPrice: Expect error.', async () => {
        try {
          await utils.validate.unitSpecialPrice({ hotelAddress, unitAddress, price, fromDate });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
    describe('unitSpecialLifPrice', function () {
      const hotelAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c7';
      const unitAddress = '0x9ec823DB4c3B774e82DE9d8B94185Cb3d78277c9';
      const price = '22';
      const fromDate = new Date('10/10/2020');
      const daysAmount = 3;
      it('validate unitSpecialLifPrice: Expect OK.', async () => {
        try {
          await utils.validate.unitSpecialLifPrice({ hotelAddress, unitAddress, price, fromDate, daysAmount });
        } catch (err) {
          assert.isNull(err);
        }
      });
      it('validate unitSpecialPrice: Expect error.', async () => {
        try {
          await utils.validate.unitSpecialLifPrice({ hotelAddress, unitAddress, price, fromDate });
        } catch (err) {
          assert.isNotNull(err);
        }
      });
    });
  });
});

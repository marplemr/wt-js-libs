const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const moment = require('moment')

const dateValidator = Joi.alternatives().try(
          Joi.date().format(['YYYY/MM/DD', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss.SSS']).required(),
          Joi.number().integer().required() );
const addressValidator =  Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required();
const txHashValidator =  Joi.string().regex(/^0x[a-fA-F0-9]{64}$/).required();
const addressesValidator = Joi.array().items(addressValidator).single().required();
const monetaryValidator = Joi.alternatives().try(Joi.number().required(), Joi.string().regex(/^\d+$/).required());

const unitValidator = {
  hotelAddress: addressValidator,
  unitAddress: addressValidator,
}

const unitTypeValidator = {
  hotelAddress: addressValidator,
  unitType: Joi.string().required()
}

const unitDateRangeValidator = {
  ...unitValidator,
  fromDate: dateValidator,
  daysAmount: Joi.number().required()
}

function addressAndRange(params) {
  const schema = Joi.object().keys({
    ...unitValidator,
    fromDate: dateValidator,
    daysAmount: Joi.number().positive().optional()
  });
  return Joi.validate(params, schema);
}

function addressAndDate(params) {
  const schema = Joi.object().keys({
    ...unitValidator,
    date: dateValidator
  });
  return Joi.validate(params, schema);
}

function addressesAndBlock(params) {
  const schema = Joi.object().keys({
    _addresses: addressesValidator,
    fromBlock: Joi.number().min(0).required()
  });
  return Joi.validate(params, schema);
}

function addresses(params) {
  const schema = Joi.object().keys({
    _addresses:addressesValidator
  });
  return Joi.validate(params, schema);
}

function bookInfo(params) {
  const schema = Joi.object().keys({
    ...unitDateRangeValidator,
    guestData: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

function cost(params) {
  const schema = Joi.object().keys({
    cost: monetaryValidator
  });
  return Joi.validate(params, schema);
}

function hotelAddress(params) {
  const schema = Joi.object().keys({
    hotelAddress: addressValidator
  });
  return Joi.validate(params, schema);
}

function addressAndDay(params) {
  const schema = Joi.object().keys({
    unitAddress: addressValidator,
    day: dateValidator
  });
  return Joi.validate(params, schema);
}

function nameAndDescription(params) {
  const schema = Joi.object().keys({
    name: Joi.string(),
    description: Joi.string()
  });
  return Joi.validate(params, schema);
}

function hotelAddressAndValue(params) {
  const schema = Joi.object().keys({
    hotelAddress: addressValidator,
    value: Joi.boolean().strict()
  });
  return Joi.validate(params, schema);
}

function physicalAddress(params) {
  const schema = Joi.object().keys({
    hotelAddress: addressValidator,
    lineOne: Joi.string(),
    lineTwo: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string()
  });
  return Joi.validate(params, schema);
}

function hotelCoordinatesAndTimezone(params) {
  const schema = Joi.object().keys({
    hotelAddress: addressValidator,
    timezone: Joi.number(),
    latitude: Joi.number(),
    longitude: Joi.number()
  });
  return Joi.validate(params, schema);
}

function hotelAddressAndUrl(params) {
  const schema = Joi.object().keys({
    hotelAddress: addressValidator,
    url: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

function hotelAddressAndImageIndex(params) {
  const schema = Joi.object().keys({
    hotelAddress: addressValidator,
    imageIndex: Joi.number().integer().required()
  });
  return Joi.validate(params, schema);
}

function hotelAddressAndreservationId(params) {
  const schema = Joi.object().keys({
    hotelAddress: addressValidator,
    reservationId: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

function hotelAddressAndUnitType(params) {
  const schema = Joi.object().keys({
    ...unitTypeValidator
  });
  return Joi.validate(params, schema);
}

function unitTypeInfo(params) {
  const schema = Joi.object().keys({
    ...unitTypeValidator,
    description: Joi.string(),
    minGuests: Joi.number().positive(),
    maxGuests: Joi.number().positive(),
  });
  return Joi.validate(params, schema);
}

function unitTypeAmenity(params) {
  const schema = Joi.object().keys({
    ...unitTypeValidator,
    amenity: Joi.number().positive().required()
  });
  return Joi.validate(params, schema);
}

function addImageUnitType(params) {
  const schema = Joi.object().keys({
    ...unitTypeValidator,
    url: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

function removeImageUnitType(params) {
  const schema = Joi.object().keys({
    ...unitTypeValidator,
    imageIndex: Joi.number().min(0).required()
  });
  return Joi.validate(params, schema);
}

function hotelAddressAndUnitAddress(params) {
  const schema = Joi.object().keys({
    ...unitValidator
  });
  return Joi.validate(params, schema);
}

function unitActive(params) {
  const schema = Joi.object().keys({
    ...unitValidator,
    active: Joi.boolean().strict().required()
  });
  return Joi.validate(params, schema);
}

function unitTypePrice(params) {
  const schema = Joi.object().keys({
    ...unitTypeValidator,
    price: monetaryValidator
  });
  return Joi.validate(params, schema);
}

function unitTypeLifPrice(params) {
  const schema = Joi.object().keys({
    ...unitTypeValidator,
    price: Joi.number().min(0).required()
  });
  return Joi.validate(params, schema);
}

function currencyCode(params) {
  const schema = Joi.object().keys({
    ...unitTypeValidator,
    code: Joi.number().required()
  });
  return Joi.validate(params, schema);
}

function unitSpecialPrice(params) {
  const schema = Joi.object().keys({
    ...unitDateRangeValidator,
    price: monetaryValidator,
  });
  return Joi.validate(params, schema);
}

function unitSpecialLifPrice(params) {
  const schema = Joi.object().keys({
    ...unitDateRangeValidator,
    price: Joi.number().min(0).required(),
  });
  return Joi.validate(params, schema);
}

function txHash(params) {
  const schema = Joi.object().keys({
    txHash: txHashValidator
  });
  return Joi.validate(params, schema);
}

module.exports = {
  addImageUnitType,
  addresses,
  addressAndDate,
  addressAndDay,
  addressesAndBlock,
  addressAndRange,
  bookInfo,
  cost,
  currencyCode,
  hotelAddress,
  hotelAddressAndImageIndex,
  hotelAddressAndreservationId,
  hotelAddressAndUnitAddress,
  hotelAddressAndUnitType,
  hotelAddressAndUrl,
  hotelAddressAndValue,
  hotelCoordinatesAndTimezone,
  nameAndDescription,
  physicalAddress,
  removeImageUnitType,
  txHash,
  unitActive,
  unitSpecialPrice,
  unitSpecialPrice,
  unitSpecialLifPrice,
  unitTypeLifPrice,
  unitTypePrice,
  unitTypeAmenity,
  unitTypeInfo
}

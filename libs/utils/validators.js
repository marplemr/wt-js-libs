const BaseJoi = require('joi');
const Extension = require('joi-date-extensions');
const Joi = BaseJoi.extend(Extension);
const moment = require('moment')
async function addressAndRange(params) {
  const schema = Joi.object().keys({
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    fromDate: Joi.date().format(['YYYY/MM/DD', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss.SSS']).required(),
    daysAmount: Joi.number().positive().optional()
  });
  return Joi.validate(params, schema);
}

async function addressAndDate(params) {
  const schema = Joi.object().keys({
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    date: Joi.date().format(['YYYY/MM/DD', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss.SSS']).required()
  });
  return Joi.validate(params, schema);
}

async function addressesAndBlock(params) {
  const schema = Joi.object().keys({
    _addresses: Joi.array().items(Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required()).single().required(),
    fromBlock: Joi.number().min(0).required()
  });
  return Joi.validate(params, schema);
}

async function addresses(params) {
  const schema = Joi.object().keys({
    _addresses: Joi.array().items(Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required()).single().required()
  });
  return Joi.validate(params, schema);
}

async function bookInfo(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    fromDate: Joi.date().format(['YYYY/MM/DD', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss.SSS']).required(),
    daysAmount: Joi.number().positive().optional(),
    guestData: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

async function cost(params) {
  const schema = Joi.object().keys({
    cost: Joi.alternatives().try(Joi.number().required(), Joi.string().regex(/^\d+$/).required())
  });
  return Joi.validate(params, schema);
}

async function hotelAddress(params) {
  const schema = Joi.object().keys({
      hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required()
  });
  return Joi.validate(params, schema);
}

async function addressAndDay(params) {
  const schema = Joi.object().keys({
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    day: Joi.alternatives().try(Joi.number(), Joi.date().format(['YYYY/MM/DD', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss.SSS']))
  });
  return Joi.validate(params, schema);
}

async function nameAndDescription(params) {
  const schema = Joi.object().keys({
    name: Joi.string(),
    description: Joi.string()
  });
  return Joi.validate(params, schema);
}

async function hotelAddressAndValue(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    value: Joi.boolean().strict()
  });
  return Joi.validate(params, schema);
}

async function physicalAddress(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    lineOne: Joi.string(),
    lineTwo: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string()
  });
  return Joi.validate(params, schema);
}

async function hotelCoordinatesAndTimezone(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    timezone: Joi.number(),
    latitude: Joi.number(),
    longitude: Joi.number()
  });
  return Joi.validate(params, schema);
}

async function hotelAddressAndUrl(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    url: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

async function hotelAddressAndImageIndex(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    imageIndex: Joi.number().integer().required()
  });
  return Joi.validate(params, schema);
}

async function hotelAddressAndreservationId(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    reservationId: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

async function hotelAddressAndUnitType(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitType: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

async function unitTypeInfo(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitType: Joi.string().required(),
    description: Joi.string(),
    minGuests: Joi.number().positive(),
    maxGuests: Joi.number().positive(),
    price: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

async function unitTypeAmenity(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitType: Joi.string().required(),
    amenity: Joi.number().positive().required()
  });
  return Joi.validate(params, schema);
}

async function addImageUnitType(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitType: Joi.string().required(),
    url: Joi.string().required()
  });
  return Joi.validate(params, schema);
}

async function removeImageUnitType(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitType: Joi.string().required(),
    imageIndex: Joi.number().min(0).required()
  });
  return Joi.validate(params, schema);
}

async function hotelAddressAndUnitAddress(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required()
  });
  return Joi.validate(params, schema);
}

async function unitActive(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    active: Joi.boolean().strict().required()
  });
  return Joi.validate(params, schema);
}

async function unitPrice(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    price: Joi.number().required()
  });
  return Joi.validate(params, schema);
}

async function unitLifPrice(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    price: Joi.alternatives().try(Joi.number().required(), Joi.string().regex(/^\d+$/).required())
  });
  return Joi.validate(params, schema);
}

async function currencyCode(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    code: Joi.number().required()
  });
  return Joi.validate(params, schema);
}

async function unitSpecialPrice(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    price: Joi.number().required(),
    fromDate: Joi.alternatives().try(Joi.number(), Joi.date().format(['YYYY/MM/DD', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss.SSS'])),
    amountDays: Joi.number().required()
  });
  return Joi.validate(params, schema);
}

async function unitSpecialLifPrice(params) {
  const schema = Joi.object().keys({
    hotelAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    unitAddress: Joi.string().regex(/^0x[a-fA-F0-9]{40}$/).required(),
    price: Joi.alternatives().try(Joi.number().required(), Joi.string().regex(/^\d+$/).required()),
    fromDate: Joi.alternatives().try(Joi.number(), Joi.date().format(['YYYY/MM/DD', 'DD-MM-YYYY', 'YYYY-MM-DDTHH:mm:ss.SSS'])),
    amountDays: Joi.number().required()
  });
  return Joi.validate(params, schema);
}

async function txHash(params) {
  const schema = Joi.object().keys({
    txHash: Joi.string().regex(/^0x[a-fA-F0-9]{64}$/).required()
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
  unitSpecialPrice,
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
  unitLifPrice,
  unitPrice,
  unitSpecialPrice,
  unitSpecialLifPrice,
  unitTypeAmenity,
  unitTypeInfo
}

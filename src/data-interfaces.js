// @flow
/**
 * Index file for more data urls. This is the
 * initial document that blockchain is pointing to.
 */
export interface HotelDataIndex {
  descriptionUrl: string
}

/**
 * Generic GPS location.
 */
export interface LocationInterface {
  latitude?: ?number;
  longitude?: ?number
}

/**
 * Generic contact.
 */
export interface ContactInterface {
  email?: Promise<?string> | ?string;
  phone?: Promise<?string> | ?string;
  url?: Promise<?string> | ?string;
  ethereum?: Promise<?string> | ?string
}

/**
 * A map of hotel contacts.
 */
export interface ContactsInterface {
  general: ?ContactInterface
}

/**
 * Generic address interface.
 */
export interface AddressInterface {
  line1?: Promise<?string> | ?string;
  line2?: Promise<?string> | ?string;
  zip?: Promise<?string> | ?string;
  city?: Promise<?string> | ?string;
  state?: Promise<?string> | ?string;
  country?: Promise<?string> | ?string
}

/**
 * Description of additional descriptive hotel data.
 * @see https://github.com/windingtree/wt-js-libs/issues/125
 */
export interface HotelDescriptionInterface {
  name?: Promise<?string> | ?string;
  description?: Promise<?string> | ?string;
  contacts?: Promise<?ContactsInterface> | ?ContactsInterface;
  address?: Promise<?AddressInterface> | ?AddressInterface;
  location?: Promise<?LocationInterface> | ?LocationInterface;
  timezone?: Promise<?string> | ?string;
  currency?: Promise<?string> | ?string;
  images?: Promise<?Array<string>> | ?Array<string>;
  amenities?: Promise<?Array<string>> | ?Array<string>;
  createdAt: Promise<?string> | ?string;
  updatedAt: Promise<?string> | ?string
}

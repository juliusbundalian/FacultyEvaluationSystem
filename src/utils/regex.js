const regex = {
  validateEmail (val) {
    const re = /^[A-Z0-9a-z._]+[@][a-zA-Z0-9]+(([.][a-zA-Z0-9]{2,10}){1,2})+$/
    return re.test(val)
  },
  validateMobtel (val) {
    const re = /^(((09|[+]639)([0-9]{9}|[0-9]{3}(([0-9]{3}[0-9]{4})|[0-9]{7}))))$/
    return re.test(val)
  },
  validateAlphaNumeric (val, length) {
    const re = new RegExp('^^([ñÑA-Za-z0-9 .,]){0,' + length + '}$')
    return re.test(val)
  },
  validateDate (val) { // yyyy-mm-dd
    const re = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/
    return re.test(val)
  },
  validateMpin (val) {
    const re1 = /^([0-9])\1*$/
    const re2 = /^(?!(.)\1{4})(?!0123|1234|2345|3456|4567|5678|6789|7890|0987|3210|4321|5432|6543|7654|8765|9876|0987)\d{4}$/
    return !re1.test(val) && re2.test(val)
  },
}
export default regex
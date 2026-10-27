const AsyncWrapper = require('../utils/AsyncWrapper');

class BaseController {
    constructor() {
        this.asyncWrapper = AsyncWrapper
    }
}

module.exports = BaseController;
// 数据验证工具

/**
 * 验证规则配置
 */
const VALIDATION_RULES = {
  // 手机号
  phone: {
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入正确的手机号码'
  },

  // 固定电话
  tel: {
    pattern: /^(\d{3,4}-)?\d{7,8}(-\d{1,6})?$/,
    message: '请输入正确的固定电话号码'
  },

  // 邮箱
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message: '请输入正确的邮箱地址'
  },

  // 身份证号
  idCard: {
    pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
    message: '请输入正确的身份证号码'
  },

  // 密码（8-20位，包含字母和数字）
  password: {
    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,20}$/,
    message: '密码需8-20位，包含字母和数字'
  },

  // 强密码（8-20位，包含大小写字母、数字和特殊字符）
  strongPassword: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/,
    message: '密码需8-20位，包含大小写字母、数字和特殊字符'
  },

  // 中文姓名（2-10个中文字符）
  chineseName: {
    pattern: /^[\u4e00-\u9fa5]{2,10}$/,
    message: '请输入2-10个中文字符'
  },

  // 用户名（4-20位字母数字下划线，以字母开头）
  username: {
    pattern: /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/,
    message: '用户名需4-20位字母数字下划线，以字母开头'
  },

  // 金额（最多两位小数）
  amount: {
    pattern: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
    message: '请输入正确的金额格式'
  },

  // 正整数
  positiveInteger: {
    pattern: /^[1-9]\d*$/,
    message: '请输入正整数'
  },

  // 非负整数
  nonNegativeInteger: {
    pattern: /^\d+$/,
    message: '请输入非负整数'
  },

  // URL
  url: {
    pattern: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
    message: '请输入正确的URL地址'
  },

  // 日期格式 YYYY-MM-DD
  date: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: '请输入正确的日期格式（YYYY-MM-DD）'
  },

  // 时间格式 HH:mm
  time: {
    pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: '请输入正确的时间格式（HH:mm）'
  },

  // 日期时间格式 YYYY-MM-DD HH:mm
  dateTime: {
    pattern: /^\d{4}-\d{2}-\d{2} ([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: '请输入正确的日期时间格式（YYYY-MM-DD HH:mm）'
  }
};

/**
 * 验证器类
 */
class Validator {
  /**
   * 验证单个值
   * @param {any} value - 要验证的值
   * @param {string|Object} rule - 验证规则
   * @returns {Object} 验证结果
   */
  static validate(value, rule) {
    // 如果是字符串，查找预定义规则
    if (typeof rule === 'string') {
      rule = VALIDATION_RULES[rule];
      if (!rule) {
        return { valid: false, message: `未知的验证规则: ${rule}` };
      }
    }

    // 必填验证
    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        valid: false,
        message: rule.requiredMessage || '此字段为必填项'
      };
    }

    // 如果不是必填且值为空，则验证通过
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return { valid: true };
    }

    // 类型验证
    if (rule.type && !this.validateType(value, rule.type)) {
      return {
        valid: false,
        message: rule.typeMessage || `值类型应为${rule.type}`
      };
    }

    // 长度验证
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return {
        valid: false,
        message: rule.minLengthMessage || `长度不能少于${rule.minLength}个字符`
      };
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return {
        valid: false,
        message: rule.maxLengthMessage || `长度不能超过${rule.maxLength}个字符`
      };
    }

    // 数值范围验证
    if (rule.min !== undefined && value < rule.min) {
      return {
        valid: false,
        message: rule.minMessage || `值不能小于${rule.min}`
      };
    }

    if (rule.max !== undefined && value > rule.max) {
      return {
        valid: false,
        message: rule.maxMessage || `值不能大于${rule.max}`
      };
    }

    // 正则表达式验证
    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        valid: false,
        message: rule.message || '格式不正确'
      };
    }

    // 自定义验证函数
    if (rule.validator && typeof rule.validator === 'function') {
      const result = rule.validator(value);
      if (result !== true) {
        return {
          valid: false,
          message: typeof result === 'string' ? result : (rule.message || '验证失败')
        };
      }
    }

    return { valid: true };
  }

  /**
   * 验证对象
   * @param {Object} data - 要验证的对象
   * @param {Object} rules - 验证规则
   * @param {Object} options - 验证选项
   * @returns {Object} 验证结果
   */
  static validateObject(data, rules, options = {}) {
    const result = {
      valid: true,
      errors: {},
      firstError: null
    };

    const { stopOnFirstError = false } = options;

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      const fieldResult = this.validate(value, rule);

      if (!fieldResult.valid) {
        result.valid = false;
        result.errors[field] = fieldResult.message;

        if (!result.firstError) {
          result.firstError = {
            field,
            message: fieldResult.message,
            value
          };
        }

        if (stopOnFirstError) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * 验证数组
   * @param {Array} array - 要验证的数组
   * @param {Object} rule - 验证规则
   * @returns {Object} 验证结果
   */
  static validateArray(array, rule) {
    const result = { valid: true, errors: [] };

    // 检查是否为数组
    if (!Array.isArray(array)) {
      return {
        valid: false,
        errors: ['值必须是数组']
      };
    }

    // 长度验证
    if (rule.minLength !== undefined && array.length < rule.minLength) {
      result.valid = false;
      result.errors.push(`数组长度不能少于${rule.minLength}`);
    }

    if (rule.maxLength !== undefined && array.length > rule.maxLength) {
      result.valid = false;
      result.errors.push(`数组长度不能超过${rule.maxLength}`);
    }

    // 验证数组元素
    if (rule.itemRule) {
      array.forEach((item, index) => {
        const itemResult = this.validate(item, rule.itemRule);
        if (!itemResult.valid) {
          result.valid = false;
          result.errors.push(`第${index + 1}项: ${itemResult.message}`);
        }
      });
    }

    return result;
  }

  /**
   * 验证类型
   * @param {any} value - 值
   * @param {string} type - 类型
   * @returns {boolean} 是否匹配类型
   */
  static validateType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'email':
        return VALIDATION_RULES.email.pattern.test(value);
      case 'phone':
        return VALIDATION_RULES.phone.pattern.test(value);
      default:
        return true;
    }
  }

  /**
   * 创建验证器函数
   * @param {string|Object} rule - 验证规则
   * @returns {Function} 验证器函数
   */
  static createValidator(rule) {
    return (value) => {
      return this.validate(value, rule);
    };
  }

  /**
   * 组合多个验证器
   * @param {Array} validators - 验证器数组
   * @param {string} mode - 组合模式 'and' | 'or'
   * @returns {Function} 组合验证器函数
   */
  static combineValidators(validators, mode = 'and') {
    return (value) => {
      const results = validators.map(validator => {
        if (typeof validator === 'string') {
          return this.validate(value, validator);
        } else if (typeof validator === 'function') {
          return validator(value);
        } else {
          return this.validate(value, validator);
        }
      });

      if (mode === 'and') {
        const firstError = results.find(result => !result.valid);
        return firstError || { valid: true };
      } else if (mode === 'or') {
        const firstSuccess = results.find(result => result.valid);
        return firstSuccess || results[0];
      }

      return { valid: false, message: '未知的组合模式' };
    };
  }

  /**
   * 异步验证
   * @param {any} value - 值
   * @param {Object} rule - 验证规则
   * @returns {Promise<Object>} 验证结果
   */
  static async validateAsync(value, rule) {
    // 同步验证
    const syncResult = this.validate(value, rule);
    if (!syncResult.valid) {
      return syncResult;
    }

    // 异步验证
    if (rule.asyncValidator && typeof rule.asyncValidator === 'function') {
      try {
        const result = await rule.asyncValidator(value);
        if (result !== true) {
          return {
            valid: false,
            message: typeof result === 'string' ? result : (rule.message || '验证失败')
          };
        }
      } catch (error) {
        return {
          valid: false,
          message: rule.asyncMessage || '异步验证失败'
        };
      }
    }

    return { valid: true };
  }
}

/**
 * 常用验证器
 */
const CommonValidators = {
  /**
   * 手机号验证器
   */
  phone: Validator.createValidator('phone'),

  /**
   * 邮箱验证器
   */
  email: Validator.createValidator('email'),

  /**
   * 身份证验证器
   */
  idCard: Validator.createValidator('idCard'),

  /**
   * 密码验证器
   */
  password: Validator.createValidator('password'),

  /**
   * 强密码验证器
   */
  strongPassword: Validator.createValidator('strongPassword'),

  /**
   * 中文姓名验证器
   */
  chineseName: Validator.createValidator('chineseName'),

  /**
   * 用户名验证器
   */
  username: Validator.createValidator('username'),

  /**
   * 金额验证器
   */
  amount: Validator.createValidator('amount'),

  /**
   * 必填验证器
   */
  required: (message) => ({
    required: true,
    requiredMessage: message || '此字段为必填项'
  }),

  /**
   * 长度验证器
   */
  length: (min, max, message) => ({
    minLength: min,
    maxLength: max,
    message: message || `长度应在${min}-${max}个字符之间`
  }),

  /**
   * 数值范围验证器
   */
  range: (min, max, message) => ({
    min,
    max,
    message: message || `值应在${min}-${max}之间`
  }),

  /**
   * 自定义验证器
   */
  custom: (validator, message) => ({
    validator,
    message
  }),

  /**
   * 异步验证器
   */
  async: (asyncValidator, message) => ({
    asyncValidator,
    message,
    asyncMessage: message
  })
};

/**
 * 表单验证工具
 */
class FormValidator {
  constructor() {
    this.rules = {};
    this.data = {};
    this.errors = {};
  }

  /**
   * 添加验证规则
   * @param {string} field - 字段名
   * @param {Object} rule - 验证规则
   */
  addRule(field, rule) {
    this.rules[field] = rule;
    return this;
  }

  /**
   * 设置表单数据
   * @param {Object} data - 表单数据
   */
  setData(data) {
    this.data = { ...this.data, ...data };
    return this;
  }

  /**
   * 验证整个表单
   * @returns {boolean} 是否验证通过
   */
  validate() {
    const result = Validator.validateObject(this.data, this.rules);
    this.errors = result.errors;
    return result.valid;
  }

  /**
   * 验证单个字段
   * @param {string} field - 字段名
   * @returns {boolean} 是否验证通过
   */
  validateField(field) {
    const value = this.data[field];
    const rule = this.rules[field];

    if (!rule) {
      return true;
    }

    const result = Validator.validate(value, rule);
    if (!result.valid) {
      this.errors[field] = result.message;
    } else {
      delete this.errors[field];
    }

    return result.valid;
  }

  /**
   * 获取错误信息
   * @param {string} field - 字段名（可选）
   * @returns {string|Object} 错误信息
   */
  getError(field) {
    if (field) {
      return this.errors[field] || '';
    }
    return this.errors;
  }

  /**
   * 清除错误信息
   * @param {string} field - 字段名（可选）
   */
  clearError(field) {
    if (field) {
      delete this.errors[field];
    } else {
      this.errors = {};
    }
  }

  /**
   * 检查是否有错误
   * @param {string} field - 字段名（可选）
   * @returns {boolean} 是否有错误
   */
  hasError(field) {
    if (field) {
      return !!this.errors[field];
    }
    return Object.keys(this.errors).length > 0;
  }

  /**
   * 获取第一个错误信息
   * @returns {Object} 第一个错误信息
   */
  getFirstError() {
    const firstField = Object.keys(this.errors)[0];
    if (firstField) {
      return {
        field: firstField,
        message: this.errors[firstField]
      };
    }
    return null;
  }
}

module.exports = {
  Validator,
  CommonValidators,
  FormValidator,
  VALIDATION_RULES
};
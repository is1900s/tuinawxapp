// 用户认证和管理服务
const cloud = require('wx-server-sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 获取数据库引用
const db = cloud.database();
const _ = db.command;

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'tuinawxapp-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('用户服务调用:', event.action, event);

  try {
    const { action } = event;

    // 路由到具体的处理函数
    switch (action) {
      case 'wxLogin':
        return await wxLogin(event);
      case 'phoneLogin':
        return await phoneLogin(event);
      case 'register':
        return await register(event);
      case 'refreshToken':
        return await refreshToken(event);
      case 'getUserInfo':
        return await getUserInfo(event);
      case 'updateUserInfo':
        return await updateUserInfo(event);
      case 'updatePhone':
        return await updatePhone(event);
      case 'logout':
        return await logout(event);
      case 'addAddress':
        return await addAddress(event);
      case 'updateAddress':
        return await updateAddress(event);
      case 'deleteAddress':
        return await deleteAddress(event);
      case 'getAddressList':
        return await getAddressList(event);
      case 'setDefaultAddress':
        return await setDefaultAddress(event);
      case 'updateSettings':
        return await updateSettings(event);
      case 'getSettings':
        return await getSettings(event);
      default:
        return {
          code: 400,
          message: '不支持的操作',
          data: null
        };
    }
  } catch (error) {
    console.error('用户服务错误:', error);
    return {
      code: 500,
      message: '服务器内部错误',
      data: null,
      error: error.message
    };
  }
};

/**
 * 微信登录
 */
async function wxLogin(event) {
  const { code, userInfo } = event;

  if (!code) {
    return {
      code: 400,
      message: '缺少微信授权码',
      data: null
    };
  }

  try {
    // 获取微信用户信息
    const wxResult = await cloud.openapi.auth.code2Session({
      jsCode: code
    });

    const { openid, session_key, unionid } = wxResult;

    if (!openid) {
      return {
        code: 400,
        message: '微信登录失败',
        data: null
      };
    }

    // 查询或创建用户
    const userCollection = db.collection('users');
    let user = await userCollection.where({
      openid: openid
    }).get();

    let userData;

    if (user.data.length === 0) {
      // 新用户注册
      userData = {
        openid: openid,
        unionid: unionid,
        sessionKey: session_key,
        userInfo: userInfo || {},
        phone: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 1
      };

      const result = await userCollection.add({
        data: userData
      });

      userData._id = result._id;
    } else {
      // 更新登录信息
      userData = user.data[0];
      userData.sessionKey = session_key;
      if (userInfo) {
        userData.userInfo = { ...userData.userInfo, ...userInfo };
      }
      userData.lastLoginAt = new Date();
      userData.loginCount = (userData.loginCount || 0) + 1;
      userData.updatedAt = new Date();

      await userCollection.doc(userData._id).update({
        data: {
          sessionKey: session_key,
          userInfo: userData.userInfo,
          lastLoginAt: userData.lastLoginAt,
          loginCount: userData.loginCount,
          updatedAt: userData.updatedAt
        }
      });
    }

    // 生成token
    const token = generateToken(userData._id, openid);
    const refreshToken = generateRefreshToken(userData._id, openid);

    // 保存token到数据库
    await userCollection.doc(userData._id).update({
      data: {
        lastToken: token,
        lastRefreshToken: refreshToken
      }
    });

    // 返回用户信息（排除敏感字段）
    const { sessionKey, lastToken, lastRefreshToken, ...safeUserData } = userData;

    return {
      code: 200,
      message: '登录成功',
      data: {
        token,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN,
        userInfo: safeUserData
      }
    };
  } catch (error) {
    console.error('微信登录错误:', error);
    return {
      code: 500,
      message: '登录失败',
      data: null
    };
  }
}

/**
 * 手机号登录
 */
async function phoneLogin(event) {
  const { phone, code: smsCode } = event;

  if (!phone || !smsCode) {
    return {
      code: 400,
      message: '缺少手机号或验证码',
      data: null
    };
  }

  try {
    // 验证短信验证码
    const smsResult = await verifySmsCode(phone, smsCode);
    if (!smsResult.valid) {
      return {
        code: 400,
        message: smsResult.message,
        data: null
      };
    }

    // 查询用户
    const userCollection = db.collection('users');
    let user = await userCollection.where({
      phone: phone
    }).get();

    if (user.data.length === 0) {
      return {
        code: 404,
        message: '用户不存在，请先注册',
        data: null
      };
    }

    const userData = user.data[0];

    // 更新最后登录时间
    await userCollection.doc(userData._id).update({
      data: {
        lastLoginAt: new Date(),
        loginCount: userData.loginCount + 1,
        updatedAt: new Date()
      }
    });

    // 生成token
    const token = generateToken(userData._id, userData.openid);
    const refreshToken = generateRefreshToken(userData._id, userData.openid);

    // 返回用户信息
    const { sessionKey, lastToken, lastRefreshToken, ...safeUserData } = userData;

    return {
      code: 200,
      message: '登录成功',
      data: {
        token,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN,
        userInfo: safeUserData
      }
    };
  } catch (error) {
    console.error('手机号登录错误:', error);
    return {
      code: 500,
      message: '登录失败',
      data: null
    };
  }
}

/**
 * 用户注册
 */
async function register(event) {
  const { phone, code: smsCode, password, userInfo } = event;

  if (!phone || !smsCode) {
    return {
      code: 400,
      message: '缺少手机号或验证码',
      data: null
    };
  }

  try {
    // 验证短信验证码
    const smsResult = await verifySmsCode(phone, smsCode);
    if (!smsResult.valid) {
      return {
        code: 400,
        message: smsResult.message,
        data: null
      };
    }

    // 检查用户是否已存在
    const userCollection = db.collection('users');
    const existingUser = await userCollection.where({
      phone: phone
    }).get();

    if (existingUser.data.length > 0) {
      return {
        code: 409,
        message: '该手机号已注册',
        data: null
      };
    }

    // 加密密码（如果提供）
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 创建新用户
    const userData = {
      phone: phone,
      password: hashedPassword,
      userInfo: userInfo || {},
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      loginCount: 1,
      settings: {
        notifications: true,
        location: true,
        marketing: false
      }
    };

    const result = await userCollection.add({
      data: userData
    });

    userData._id = result._id;

    // 生成token
    const token = generateToken(userData._id, null);
    const refreshToken = generateRefreshToken(userData._id, null);

    // 返回用户信息
    const { password: _, ...safeUserData } = userData;

    return {
      code: 200,
      message: '注册成功',
      data: {
        token,
        refreshToken,
        expiresIn: JWT_EXPIRES_IN,
        userInfo: safeUserData
      }
    };
  } catch (error) {
    console.error('注册错误:', error);
    return {
      code: 500,
      message: '注册失败',
      data: null
    };
  }
}

/**
 * 刷新token
 */
async function refreshToken(event) {
  const { refreshToken } = event;

  if (!refreshToken) {
    return {
      code: 400,
      message: '缺少刷新令牌',
      data: null
    };
  }

  try {
    // 验证刷新token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const userId = decoded.userId;

    // 查询用户
    const userCollection = db.collection('users');
    const user = await userCollection.doc(userId).get();

    if (!user.data) {
      return {
        code: 404,
        message: '用户不存在',
        data: null
      };
    }

    const userData = user.data;

    // 检查用户状态
    if (userData.status !== 'active') {
      return {
        code: 403,
        message: '用户已被禁用',
        data: null
      };
    }

    // 生成新token
    const newToken = generateToken(userId, userData.openid);
    const newRefreshToken = generateRefreshToken(userId, userData.openid);

    // 更新用户的token
    await userCollection.doc(userId).update({
      data: {
        lastToken: newToken,
        lastRefreshToken: newRefreshToken,
        updatedAt: new Date()
      }
    });

    return {
      code: 200,
      message: 'Token刷新成功',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: JWT_EXPIRES_IN
      }
    };
  } catch (error) {
    console.error('刷新token错误:', error);
    return {
      code: 401,
      message: '刷新令牌无效或已过期',
      data: null
    };
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(event) {
  try {
    const userId = event.userId || await getUserIdFromToken(event.token);

    if (!userId) {
      return {
        code: 401,
        message: '未授权',
        data: null
      };
    }

    const userCollection = db.collection('users');
    const user = await userCollection.doc(userId).get();

    if (!user.data) {
      return {
        code: 404,
        message: '用户不存在',
        data: null
      };
    }

    // 返回安全的用户信息
    const { password, sessionKey, lastToken, lastRefreshToken, ...safeUserData } = user.data;

    return {
      code: 200,
      message: '获取成功',
      data: safeUserData
    };
  } catch (error) {
    console.error('获取用户信息错误:', error);
    return {
      code: 500,
      message: '获取失败',
      data: null
    };
  }
}

/**
 * 更新用户信息
 */
async function updateUserInfo(event) {
  const { userInfo } = event;

  if (!userInfo) {
    return {
      code: 400,
      message: '缺少用户信息',
      data: null
    };
  }

  try {
    const userId = event.userId || await getUserIdFromToken(event.token);

    if (!userId) {
      return {
        code: 401,
        message: '未授权',
        data: null
      };
    }

    const userCollection = db.collection('users');

    await userCollection.doc(userId).update({
      data: {
        userInfo: userInfo,
        updatedAt: new Date()
      }
    });

    return {
      code: 200,
      message: '更新成功',
      data: null
    };
  } catch (error) {
    console.error('更新用户信息错误:', error);
    return {
      code: 500,
      message: '更新失败',
      data: null
    };
  }
}

/**
 * 更新手机号
 */
async function updatePhone(event) {
  const { phone, code: smsCode } = event;

  if (!phone || !smsCode) {
    return {
      code: 400,
      message: '缺少手机号或验证码',
      data: null
    };
  }

  try {
    const userId = event.userId || await getUserIdFromToken(event.token);

    if (!userId) {
      return {
        code: 401,
        message: '未授权',
        data: null
      };
    }

    // 验证短信验证码
    const smsResult = await verifySmsCode(phone, smsCode);
    if (!smsResult.valid) {
      return {
        code: 400,
        message: smsResult.message,
        data: null
      };
    }

    // 检查手机号是否已被使用
    const userCollection = db.collection('users');
    const existingUser = await userCollection.where({
      phone: phone,
      _id: _.neq(userId)
    }).get();

    if (existingUser.data.length > 0) {
      return {
        code: 409,
        message: '该手机号已被使用',
        data: null
      };
    }

    await userCollection.doc(userId).update({
      data: {
        phone: phone,
        updatedAt: new Date()
      }
    });

    return {
      code: 200,
      message: '手机号更新成功',
      data: null
    };
  } catch (error) {
    console.error('更新手机号错误:', error);
    return {
      code: 500,
      message: '更新失败',
      data: null
    };
  }
}

/**
 * 登出
 */
async function logout(event) {
  try {
    const userId = event.userId || await getUserIdFromToken(event.token);

    if (userId) {
      // 清除用户的token记录
      const userCollection = db.collection('users');
      await userCollection.doc(userId).update({
        data: {
          lastToken: null,
          lastRefreshToken: null,
          updatedAt: new Date()
        }
      });
    }

    return {
      code: 200,
      message: '登出成功',
      data: null
    };
  } catch (error) {
    console.error('登出错误:', error);
    return {
      code: 500,
      message: '登出失败',
      data: null
    };
  }
}

/**
 * 添加地址
 */
async function addAddress(event) {
  const { address } = event;

  if (!address) {
    return {
      code: 400,
      message: '缺少地址信息',
      data: null
    };
  }

  try {
    const userId = event.userId || await getUserIdFromToken(event.token);

    if (!userId) {
      return {
        code: 401,
        message: '未授权',
        data: null
      };
    }

    const addressData = {
      ...address,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('user_addresses').add({
      data: addressData
    });

    addressData._id = result._id;

    return {
      code: 200,
      message: '添加成功',
      data: addressData
    };
  } catch (error) {
    console.error('添加地址错误:', error);
    return {
      code: 500,
      message: '添加失败',
      data: null
    };
  }
}

/**
 * 获取地址列表
 */
async function getAddressList(event) {
  try {
    const userId = event.userId || await getUserIdFromToken(event.token);

    if (!userId) {
      return {
        code: 401,
        message: '未授权',
        data: null
      };
    }

    const addresses = await db.collection('user_addresses')
      .where({
        userId: userId
      })
      .orderBy('isDefault', 'desc')
      .orderBy('createdAt', 'desc')
      .get();

    return {
      code: 200,
      message: '获取成功',
      data: addresses.data
    };
  } catch (error) {
    console.error('获取地址列表错误:', error);
    return {
      code: 500,
      message: '获取失败',
      data: null
    };
  }
}

/**
 * 生成JWT token
 */
function generateToken(userId, openid) {
  return jwt.sign(
    {
      userId,
      openid,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * 生成刷新token
 */
function generateRefreshToken(userId, openid) {
  return jwt.sign(
    {
      userId,
      openid,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
}

/**
 * 从token获取用户ID
 */
async function getUserIdFromToken(token) {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    console.error('Token验证失败:', error);
    return null;
  }
}

/**
 * 验证短信验证码
 */
async function verifySmsCode(phone, code) {
  try {
    const smsCollection = db.collection('sms_codes');
    const result = await smsCollection
      .where({
        phone: phone,
        code: code,
        used: false
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (result.data.length === 0) {
      return {
        valid: false,
        message: '验证码无效或已过期'
      };
    }

    const smsRecord = result.data[0];
    const now = new Date();
    const createdAt = new Date(smsRecord.createdAt);
    const diffMinutes = (now - createdAt) / (1000 * 60);

    // 验证码5分钟内有效
    if (diffMinutes > 5) {
      return {
        valid: false,
        message: '验证码已过期'
      };
    }

    // 标记验证码已使用
    await smsCollection.doc(smsRecord._id).update({
      data: {
        used: true,
        usedAt: new Date()
      }
    });

    return { valid: true };
  } catch (error) {
    console.error('验证短信验证码错误:', error);
    return {
      valid: false,
      message: '验证失败'
    };
  }
}
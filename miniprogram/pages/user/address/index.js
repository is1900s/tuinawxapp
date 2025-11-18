// 地址管理页面
const app = getApp();

Page({
  data: {
    // 页面状态
    loading: false,
    refreshing: false,

    // 地址列表
    addressList: [],
    selectedAddressId: '',

    // 当前位置
    currentLocation: null,
    locationLoading: false,
    locationError: false,

    // 页面模式
    mode: 'manage', // manage: 管理, select: 选择
    returnPage: '', // 返回页面

    // 表单相关
    showEditModal: false,
    editMode: 'add', // add: 新增, edit: 编辑
    editForm: {
      id: '',
      name: '',
      phone: '',
      region: ['', '', ''],
      detailAddress: '',
      location: null,
      note: '',
      type: 'home', // home, company, other
      isDefault: false
    },

    // 地图相关
    showMapModal: false,
    mapCenter: {
      latitude: 39.9042,
      longitude: 116.4074
    },
    selectedLocation: null,

    // 删除确认
    showDeleteModal: false,
    deleteTargetAddress: null,

    // 长按菜单
    showLongPressMenu: false,
    longPressAddress: null,

    // 搜索相关
    searchKeyword: '',
    searchResults: [],
    showSearchResults: false,

    // 排序方式
    sortBy: 'default' // default: 默认, distance: 距离, recently: 最近使用
  },

  onLoad(options) {
    // 处理页面模式
    if (options.mode) {
      this.setData({ mode: options.mode });
    }

    // 处理返回页面
    if (options.returnPage) {
      this.setData({ returnPage: options.returnPage });
    }

    // 处理预选地址
    if (options.selectedId) {
      this.setData({ selectedAddressId: options.selectedId });
    }

    // 初始化页面
    this.initPage();
  },

  onShow() {
    // 刷新地址列表
    this.loadAddressList();
  },

  onPullDownRefresh() {
    this.refreshData();
  },

  onShareAppMessage() {
    return {
      title: '地址管理',
      path: '/pages/user/address/index',
      imageUrl: '/images/share-address.jpg'
    };
  },

  // 初始化页面
  async initPage() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 并行加载数据
      await Promise.all([
        this.loadAddressList(),
        this.getCurrentLocation()
      ]);

    } catch (error) {
      console.error('页面初始化失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载地址列表
  async loadAddressList() {
    try {
      this.setData({ loading: true });

      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'addresses'
        }
      });

      if (result.result.code === 0) {
        let addressList = result.result.data || [];

        // 如果有排序方式，对地址进行排序
        if (this.data.sortBy !== 'default') {
          addressList = this.sortAddressList(addressList, this.data.sortBy);
        }

        this.setData({ addressList });

        // 计算距离
        this.calculateDistances();

      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('加载地址列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      this.setData({ locationLoading: true, locationError: false });

      const location = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          success: (res) => {
            resolve({
              latitude: res.latitude,
              longitude: res.longitude
            });
          },
          fail: reject
        });
      });

      // 逆地理编码获取地址信息
      const address = await this.getAddressFromLocation(location);

      this.setData({
        currentLocation: {
          ...location,
          address,
          accuracy: 50 // 模拟精度
        }
      });

      // 更新地图中心
      this.setData({
        mapCenter: location
      });

    } catch (error) {
      console.error('获取位置失败:', error);
      this.setData({
        locationError: true,
        currentLocation: {
          latitude: 39.9042,
          longitude: 116.4074,
          address: '获取位置失败，请检查定位权限'
        }
      });
    } finally {
      this.setData({ locationLoading: false });
    }
  },

  // 逆地理编码
  async getAddressFromLocation(location) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'location',
        data: {
          action: 'reverseGeocode',
          latitude: location.latitude,
          longitude: location.longitude
        }
      });

      if (result.result.code === 0) {
        return result.result.data.address;
      }
    } catch (error) {
      console.error('逆地理编码失败:', error);
    }

    return '位置解析失败';
  },

  // 计算距离
  calculateDistances() {
    if (!this.data.currentLocation) return;

    const addressList = this.data.addressList.map(address => {
      if (address.location) {
        const distance = this.calculateDistance(
          this.data.currentLocation,
          address.location
        );
        return {
          ...address,
          distance: Math.round(distance * 100) / 100 // 保留两位小数
        };
      }
      return address;
    });

    this.setData({ addressList });
  },

  // 计算两点间距离（简化版）
  calculateDistance(point1, point2) {
    const R = 6371; // 地球半径（公里）
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  },

  // 刷新数据
  async refreshData() {
    try {
      this.setData({ refreshing: true });

      await Promise.all([
        this.loadAddressList(),
        this.getCurrentLocation()
      ]);

      wx.stopPullDownRefresh();

    } catch (error) {
      console.error('刷新数据失败:', error);
      wx.stopPullDownRefresh();
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // 地址排序
  sortAddressList(addressList, sortBy) {
    const sorted = [...addressList];

    switch (sortBy) {
      case 'distance':
        return sorted.sort((a, b) => {
          if (!a.location) return 1;
          if (!b.location) return -1;
          return a.distance - b.distance;
        });
      case 'recently':
        return sorted.sort((a, b) => {
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
      default:
        return sorted.sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return 0;
        });
    }
  },

  // 地址选择相关
  onAddressTap(e) {
    if (this.data.mode === 'select') {
      const address = e.currentTarget.dataset.address;
      this.selectAddress(address);
    }
  },

  selectAddress(address) {
    // 保存选中的地址到本地存储
    wx.setStorageSync('selected_address', address);

    // 返回上一页
    if (this.data.returnPage) {
      wx.navigateBack();
    } else {
      wx.showToast({
        title: '选择成功',
        icon: 'success'
      });
    }
  },

  // 使用当前位置
  onUseCurrentLocation() {
    if (!this.data.currentLocation?.address || this.data.locationError) {
      wx.showToast({
        title: '位置获取失败',
        icon: 'none'
      });
      return;
    }

    if (this.data.mode === 'select') {
      // 将当前位置作为临时地址返回
      const currentAddress = {
        id: 'current',
        name: '当前位置',
        phone: '',
        fullAddress: this.data.currentLocation.address,
        location: this.data.currentLocation,
        type: 'current',
        isDefault: false
      };

      this.selectAddress(currentAddress);
    } else {
      // 在管理模式下，将当前位置作为新增地址的默认值
      this.setData({
        'editForm.detailAddress': this.data.currentLocation.address,
        'editForm.location': this.data.currentLocation
      });

      this.showEditModal('add');
    }
  },

  // 新增地址
  onAddAddress() {
    this.showEditModal('add');
  },

  // 编辑地址
  onEditAddress(e) {
    const address = e.currentTarget.dataset.address;
    this.showEditModal('edit', address);
  },

  // 删除地址
  onDeleteAddress(e) {
    const address = e.currentTarget.dataset.address;
    this.showDeleteConfirm(address);
  },

  // 长按地址
  onAddressLongPress(e) {
    const address = e.currentTarget.dataset.address;
    this.showLongPressMenu(address);
  },

  // 显示编辑弹窗
  showEditModal(mode, address = null) {
    const editForm = mode === 'edit' ? {
      id: address.id,
      name: address.name,
      phone: address.phone,
      region: address.region || ['', '', ''],
      detailAddress: address.detailAddress || address.fullAddress,
      location: address.location,
      note: address.note || '',
      type: address.type || 'home',
      isDefault: address.isDefault || false
    } : {
      id: '',
      name: '',
      phone: '',
      region: ['', '', ''],
      detailAddress: '',
      location: null,
      note: '',
      type: 'home',
      isDefault: false
    };

    this.setData({
      showEditModal: true,
      editMode: mode,
      editForm
    });
  },

  // 隐藏编辑弹窗
  hideEditModal() {
    this.setData({
      showEditModal: false,
      editForm: {
        id: '',
        name: '',
        phone: '',
        region: ['', '', ''],
        detailAddress: '',
        location: null,
        note: '',
        type: 'home',
        isDefault: false
      }
    });
  },

  // 表单输入处理
  onNameInput(e) {
    this.setData({
      'editForm.name': e.detail.value
    });
  },

  onPhoneInput(e) {
    this.setData({
      'editForm.phone': e.detail.value
    });
  },

  onRegionChange(e) {
    this.setData({
      'editForm.region': e.detail.value
    });
  },

  onDetailAddressInput(e) {
    this.setData({
      'editForm.detailAddress': e.detail.value
    });
  },

  onNoteInput(e) {
    this.setData({
      'editForm.note': e.detail.value
    });
  },

  onTypeSelect(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      'editForm.type': type
    });
  },

  onDefaultChange(e) {
    this.setData({
      'editForm.isDefault': e.detail.value.length > 0
    });
  },

  // 选择位置
  onLocationSelect() {
    this.setData({ showMapModal: true });
  },

  // 地图点击
  onMapTap(e) {
    const location = {
      latitude: e.detail.latitude,
      longitude: e.detail.longitude
    };

    this.setData({
      selectedLocation: location
    });

    // 获取点击位置的地址信息
    this.getAddressFromLocation(location).then(address => {
      this.setData({
        selectedLocation: {
          ...location,
          address
        }
      });
    });
  },

  // 确认位置选择
  onMapConfirm() {
    if (this.data.selectedLocation) {
      this.setData({
        'editForm.location': this.data.selectedLocation,
        'editForm.detailAddress': this.data.selectedLocation.address || this.data.editForm.detailAddress
      });
    }

    this.hideMapModal();
  },

  // 隐藏地图弹窗
  hideMapModal() {
    this.setData({
      showMapModal: false,
      selectedLocation: null
    });
  },

  // 保存地址
  async onSaveAddress() {
    if (!this.validateForm()) {
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });

      const action = this.data.editMode === 'add' ? 'createAddress' : 'updateAddress';
      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action,
          addressData: this.data.editForm
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });

        this.hideEditModal();
        this.loadAddressList();

      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('保存地址失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 表单验证
  validateForm() {
    const { name, phone, region, detailAddress } = this.data.editForm;

    if (!name.trim()) {
      wx.showToast({
        title: '请输入联系人姓名',
        icon: 'none'
      });
      return false;
    }

    if (!phone.trim()) {
      wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      });
      return false;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '手机号码格式不正确',
        icon: 'none'
      });
      return false;
    }

    if (!region || region.join('') === '') {
      wx.showToast({
        title: '请选择所在地区',
        icon: 'none'
      });
      return false;
    }

    if (!detailAddress.trim()) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 显示删除确认
  showDeleteConfirm(address) {
    this.setData({
      showDeleteModal: true,
      deleteTargetAddress: address
    });
  },

  // 隐藏删除确认
  hideDeleteModal() {
    this.setData({
      showDeleteModal: false,
      deleteTargetAddress: null
    });
  },

  // 确认删除
  async onConfirmDelete() {
    if (!this.data.deleteTargetAddress) return;

    try {
      wx.showLoading({ title: '删除中...' });

      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'deleteAddress',
          addressId: this.data.deleteTargetAddress.id
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });

        this.hideDeleteModal();
        this.loadAddressList();

      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('删除地址失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  // 显示长按菜单
  showLongPressMenu(address) {
    this.setData({
      showLongPressMenu: true,
      longPressAddress: address
    });
  },

  // 隐藏长按菜单
  hideLongPressMenu() {
    this.setData({
      showLongPressMenu: false,
      longPressAddress: null
    });
  },

  // 长按菜单操作
  onSetDefault() {
    if (this.data.longPressAddress) {
      this.setDefaultAddress(this.data.longPressAddress);
    }
    this.hideLongPressMenu();
  },

  onEditFromMenu() {
    if (this.data.longPressAddress) {
      this.showEditModal('edit', this.data.longPressAddress);
    }
    this.hideLongPressMenu();
  },

  onDeleteFromMenu() {
    if (this.data.longPressAddress) {
      this.showDeleteConfirm(this.data.longPressAddress);
    }
    this.hideLongPressMenu();
  },

  // 设为默认地址
  async setDefaultAddress(address) {
    try {
      wx.showLoading({ title: '设置中...' });

      const result = await wx.cloud.callFunction({
        name: 'user',
        data: {
          action: 'setDefaultAddress',
          addressId: address.id
        }
      });

      if (result.result.code === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '设置成功',
          icon: 'success'
        });

        this.loadAddressList();

      } else {
        throw new Error(result.result.message);
      }

    } catch (error) {
      console.error('设置默认地址失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '设置失败',
        icon: 'none'
      });
    }
  },

  // 排序方式切换
  onSortChange(e) {
    const sortBy = e.currentTarget.dataset.sort;
    if (sortBy === this.data.sortBy) return;

    this.setData({ sortBy });

    const sortedAddressList = this.sortAddressList(this.data.addressList, sortBy);
    this.setData({ addressList: sortedAddressList });
  },

  // 搜索相关
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });

    if (keyword.trim()) {
      this.searchAddresses(keyword);
    } else {
      this.setData({
        searchResults: [],
        showSearchResults: false
      });
    }
  },

  // 搜索地址
  searchAddresses(keyword) {
    const results = this.data.addressList.filter(address =>
      address.name.includes(keyword) ||
      address.fullAddress.includes(keyword) ||
      address.phone.includes(keyword)
    );

    this.setData({
      searchResults: results,
      showSearchResults: true
    });
  },

  onSearchClear() {
    this.setData({
      searchKeyword: '',
      searchResults: [],
      showSearchResults: false
    });
  },

  // 工具方法
  getAddressIcon(type) {
    const iconMap = {
      home: '🏠',
      company: '🏢',
      other: '📍'
    };
    return iconMap[type] || '📍';
  },

  getAddressTypeText(type) {
    const typeMap = {
      home: '家',
      company: '公司',
      other: '其他'
    };
    return typeMap[type] || '其他';
  },

  formatAddress(region, detail) {
    if (!region || region.join('') === '') {
      return detail;
    }
    return region.join('') + detail;
  },

  onMaskTap() {
    this.setData({
      showEditModal: false,
      showDeleteModal: false,
      showLongPressMenu: false,
      showMapModal: false
    });
  }
});
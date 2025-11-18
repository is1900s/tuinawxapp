// 技师卡片组件
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 技师信息
    technician: {
      type: Object,
      value: {},
      observer: function(newVal) {
        this.formatTechnicianData(newVal);
      }
    },

    // 是否紧凑模式
    compact: {
      type: Boolean,
      value: false
    },

    // 是否显示操作按钮
    showActions: {
      type: Boolean,
      value: true
    },

    // 是否显示快速操作
    showQuickActions: {
      type: Boolean,
      value: true
    },

    // 卡片阴影
    shadow: {
      type: String,
      value: 'medium' // none, small, medium, large
    },

    // 圆角大小
    radius: {
      type: String,
      value: 'medium' // none, small, medium, large
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 格式化后的技师数据
    formattedTechnician: {}
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 格式化技师数据
     */
    formatTechnicianData(technician) {
      if (!technician) return;

      const formatted = {
        ...technician,
        // 处理头像URL
        avatar: this.getAvatarUrl(technician.avatar),
        // 处理评分显示
        rating: this.formatRating(technician.rating),
        // 处理订单数显示
        orderCount: this.formatOrderCount(technician.orderCount),
        // 处理距离显示
        distance: this.formatDistance(technician.distance),
        // 处理服务项目
        services: this.formatServices(technician.services),
        // 处理标签
        tags: this.formatTags(technician.tags),
        // 处理状态
        statusText: this.getStatusText(technician.status),
        // 处理经验年限
        experience: technician.experience || 0
      };

      this.setData({
        formattedTechnician: formatted
      });
    },

    /**
     * 获取头像URL
     */
    getAvatarUrl(avatar) {
      if (!avatar) {
        return '/assets/images/avatars/default.png';
      }

      // 如果是相对路径，转换为绝对路径
      if (avatar.startsWith('/')) {
        return avatar;
      }

      // 如果是完整URL，直接返回
      if (avatar.startsWith('http')) {
        return avatar;
      }

      // 其他情况，默认路径
      return `/assets/images/avatars/${avatar}`;
    },

    /**
     * 格式化评分
     */
    formatRating(rating) {
      if (typeof rating !== 'number') {
        return '5.0';
      }
      return rating.toFixed(1);
    },

    /**
     * 格式化订单数
     */
    formatOrderCount(count) {
      if (typeof count !== 'number') {
        return 0;
      }

      if (count >= 10000) {
        return (count / 10000).toFixed(1) + 'w';
      } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'k';
      }

      return count;
    },

    /**
     * 格式化距离
     */
    formatDistance(distance) {
      if (typeof distance !== 'number' || distance < 0) {
        return null;
      }

      if (distance < 1) {
        return Math.round(distance * 1000) + 'm';
      } else if (distance >= 100) {
        return '99+km';
      }

      return distance.toFixed(1) + 'km';
    },

    /**
     * 格式化服务项目
     */
    formatServices(services) {
      if (!Array.isArray(services)) {
        return [];
      }

      return services.map(service => ({
        ...service,
        price: this.formatPrice(service.price),
        duration: service.duration || 60
      }));
    },

    /**
     * 格式化标签
     */
    formatTags(tags) {
      if (!Array.isArray(tags)) {
        return [];
      }

      return tags.filter(tag => tag && typeof tag === 'string').slice(0, 5);
    },

    /**
     * 格式化价格
     */
    formatPrice(price) {
      if (typeof price !== 'number') {
        return 0;
      }

      return Math.round(price);
    },

    /**
     * 获取状态文本
     */
    getStatusText(status) {
      const statusMap = {
        available: '可预约',
        busy: '忙碌',
        offline: '离线',
        rest: '休息中'
      };

      return statusMap[status] || '未知';
    },

    /**
     * 事件处理：卡片点击
     */
    onCardTap(e) {
      const technician = e.currentTarget.dataset.technician;
      this.triggerEvent('cardtap', { technician });
    },

    /**
     * 事件处理：查看详情
     */
    onViewDetail(e) {
      e.stopPropagation();
      const technician = e.currentTarget.dataset.technician;
      this.triggerEvent('viewdetail', { technician });
    },

    /**
     * 事件处理：立即预约
     */
    onBookNow(e) {
      e.stopPropagation();
      const technician = e.currentTarget.dataset.technician;
      this.triggerEvent('booknow', { technician });
    },

    /**
     * 事件处理：快速联系
     */
    onQuickCall(e) {
      e.stopPropagation();
      const technician = e.currentTarget.dataset.technician;
      this.triggerEvent('quickcall', { technician });
    },

    /**
     * 事件处理：快速预约
     */
    onQuickBook(e) {
      e.stopPropagation();
      const technician = e.currentTarget.dataset.technician;
      this.triggerEvent('quickbook', { technician });
    },

    /**
     * 事件处理：快速收藏
     */
    onQuickFavorite(e) {
      e.stopPropagation();
      const technician = e.currentTarget.dataset.technician;

      // 更新收藏状态
      const updatedTechnician = {
        ...technician,
        isFavorite: !technician.isFavorite
      };

      // 触发收藏事件
      this.triggerEvent('quickfavorite', {
        technician: updatedTechnician,
        isFavorite: updatedTechnician.isFavorite
      });
    },

    /**
     * 事件处理：分享技师
     */
    onShare(e) {
      e.stopPropagation();
      const technician = e.currentTarget.dataset.technician;
      this.triggerEvent('share', { technician });
    },

    /**
     * 计算技师与用户的距离
     */
    calculateDistance(userLocation, technicianLocation) {
      if (!userLocation || !technicianLocation) {
        return null;
      }

      const R = 6371; // 地球半径（公里）
      const dLat = this.toRad(technicianLocation.latitude - userLocation.latitude);
      const dLng = this.toRad(technicianLocation.longitude - userLocation.longitude);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(userLocation.latitude)) *
        Math.cos(this.toRad(technicianLocation.latitude)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },

    /**
     * 角度转弧度
     */
    toRad(deg) {
      return deg * (Math.PI / 180);
    },

    /**
     * 计算预计到达时间
     */
    calculateEstimateTime(distance) {
      if (typeof distance !== 'number' || distance < 0) {
        return null;
      }

      // 假设平均速度为 20km/h（考虑城市交通）
      const avgSpeed = 20;
      const timeInHours = distance / avgSpeed;
      const timeInMinutes = Math.ceil(timeInHours * 60);

      // 最少15分钟，最多120分钟
      return Math.max(15, Math.min(120, timeInMinutes));
    },

    /**
     * 显示技师状态
     */
    showTechnicianStatus(status) {
      const statusColors = {
        available: '#34C759',
        busy: '#FF9500',
        offline: '#8E8E93',
        rest: '#007AFF'
      };

      return statusColors[status] || '#8E8E93';
    },

    /**
     * 验证技师信息完整性
     */
    validateTechnicianData(technician) {
      const requiredFields = ['id', 'name', 'avatar', 'rating'];
      const missingFields = requiredFields.filter(field => !technician[field]);

      if (missingFields.length > 0) {
        console.warn('技师信息缺少必要字段:', missingFields);
        return false;
      }

      return true;
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      console.log('技师卡片组件已加载');

      // 初始化时格式化数据
      if (this.data.technician) {
        this.formatTechnicianData(this.data.technician);
      }
    },

    detached() {
      console.log('技师卡片组件已卸载');
    }
  },

  /**
   * 组件所在页面的生命周期
   */
  pageLifetimes: {
    show() {
      // 页面显示时可以刷新数据
    },
    hide() {
      // 页面隐藏时可以暂停一些操作
    }
  }
});
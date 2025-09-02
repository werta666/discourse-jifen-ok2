import Controller from "@ember/controller";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";

export default class QdShopOrdersController extends Controller {
  @service router;
  @tracked isLoading = false;

  get totalOrders() {
    return this.model?.orders?.length || 0;
  }

  get totalSpent() {
    if (!this.model?.orders) return 0;
    return this.model.orders.reduce((total, order) => {
      if (order.status === "completed") {
        return total + (order.total_price || 0);
      }
      return total;
    }, 0);
  }

  get completedOrders() {
    if (!this.model?.orders) return 0;
    return this.model.orders.filter(order => order.status === "completed").length;
  }

  @action
  goBackToShop() {
    this.router.transitionTo("qd-shop");
  }

  @action
  async refreshOrders() {
    this.isLoading = true;
    this.statusMessage = "";
    
    try {
      console.log("🔄 刷新用户订单列表");
      
      // 重新加载订单数据
      const response = await ajax("/qd/shop/orders", {
        type: "GET"
      });
      
      if (response.status === "success") {
        // 更新模型数据
        this.model.orders = response.data || [];
        
        // 触发界面更新
        this.notifyPropertyChange('model');
        
        console.log("✅ 用户订单列表刷新成功，共", this.model.orders.length, "条订单");
      } else {
        console.error("❌ 刷新失败:", response.message);
        this.statusMessage = "刷新失败: " + (response.message || "未知错误");
      }
    } catch (error) {
      console.error("❌ 刷新用户订单列表失败:", error);
      this.statusMessage = "刷新失败: " + (error.message || "网络错误");
    } finally {
      this.isLoading = false;
    }
  }

  @action
  formatDate(dateString) {
    if (!dateString) return "";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit", 
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return dateString;
    }
  }

  @action
  getStatusClass(status) {
    switch (status) {
      case "completed":
        return "status-completed";
      case "pending":
        return "status-pending";
      case "cancelled":
        return "status-cancelled";
      default:
        return "status-unknown";
    }
  }

  @action
  getStatusText(status) {
    switch (status) {
      case "completed":
        return "已完成";
      case "pending":
        return "处理中";
      case "cancelled":
        return "已取消";
      default:
        return status || "未知";
    }
  }

  @action
  getProductIcon(productName) {
    if (!productName) return "fa-gift";
    
    const name = productName.toLowerCase();
    if (name.includes("vip") || name.includes("会员")) {
      return "fa-crown";
    } else if (name.includes("头像") || name.includes("框")) {
      return "fa-user-circle";
    } else if (name.includes("宝箱") || name.includes("礼盒")) {
      return "fa-treasure-chest";
    } else if (name.includes("加速") || name.includes("boost")) {
      return "fa-rocket";
    } else if (name.includes("补签") || name.includes("卡")) {
      return "fa-calendar-plus";
    } else {
      return "fa-gift";
    }
  }
}
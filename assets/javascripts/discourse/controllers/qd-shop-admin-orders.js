import Controller from "@ember/controller";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { ajax } from "discourse/lib/ajax";

export default class QdShopAdminOrdersController extends Controller {
  @tracked isLoading = false;
  @tracked statusMessage = "";
  @tracked selectedOrder = null;
  @tracked showStatusModal = false;
  @tracked newStatus = "";
  @tracked adminNotes = "";
  @tracked currentFilter = "all";

  get filteredOrders() {
    if (!this.model?.orders) return [];
    
    const orders = this.model.orders;
    
    switch (this.currentFilter) {
      case "pending":
        return orders.filter(order => order.status === "pending");
      case "completed":
        return orders.filter(order => order.status === "completed");
      case "cancelled":
        return orders.filter(order => order.status === "cancelled");
      default:
        return orders;
    }
  }

  get orderStats() {
    if (!this.model?.orders) return { total: 0, pending: 0, completed: 0, cancelled: 0 };
    
    const orders = this.model.orders;
    return {
      total: orders.length,
      pending: orders.filter(order => order.status === "pending").length,
      completed: orders.filter(order => order.status === "completed").length,
      cancelled: orders.filter(order => order.status === "cancelled").length
    };
  }

  @action
  setFilter(filter) {
    this.currentFilter = filter;
  }

  @action
  openStatusModal(order) {
    this.selectedOrder = order;
    this.newStatus = order.status;
    this.adminNotes = "";
    this.showStatusModal = true;
    this.statusMessage = "";
  }

  @action
  closeStatusModal() {
    this.showStatusModal = false;
    this.selectedOrder = null;
    this.newStatus = "";
    this.adminNotes = "";
    this.statusMessage = "";
  }

  @action
  updateOrderStatus(status) {
    this.newStatus = status;
  }

  @action
  updateAdminNotes(event) {
    this.adminNotes = event.target.value;
  }

  @action
  async confirmUpdateOrder() {
    if (!this.selectedOrder || !this.newStatus) {
      this.statusMessage = "请选择订单状态";
      return;
    }

    this.isLoading = true;
    this.statusMessage = "";

    try {
      console.log("🔄 发送状态更新请求:", {
        orderId: this.selectedOrder.id,
        newStatus: this.newStatus,
        adminNotes: this.adminNotes || ""
      });

      const response = await ajax(`/qd/shop/admin/orders/${this.selectedOrder.id}/status`, {
        type: "PATCH",
        data: {
          status: this.newStatus,
          admin_notes: this.adminNotes || ""
        }
      });

      console.log("📥 状态更新响应:", response);

      if (response.status === "success") {
        this.statusMessage = response.message || "订单状态更新成功！";
        
        // 更新本地数据
        const orderIndex = this.model.orders.findIndex(o => o.id === this.selectedOrder.id);
        if (orderIndex !== -1) {
          this.model.orders[orderIndex].status = this.newStatus;
          this.model.orders[orderIndex].updated_at = new Date().toISOString();
          // 触发界面更新
          this.notifyPropertyChange('model');
        }

        // 如果是取消订单，显示特殊提示
        if (this.newStatus === 'cancelled' && response.data?.refunded) {
          this.statusMessage = "✅ 订单已取消，积分已自动返还给用户！";
        }

        setTimeout(() => {
          this.closeStatusModal();
        }, 2000);
      } else {
        this.statusMessage = response.message || "更新失败";
      }
    } catch (error) {
      console.error("更新订单状态失败:", error);
      const errorMessage = error.jqXHR?.responseJSON?.message || error.message || "网络错误";
      this.statusMessage = "❌ 更新失败：" + errorMessage;
    } finally {
      this.isLoading = false;
    }
  }

  @action
  async deleteOrder(order) {
    if (!confirm(`确定要删除订单 #${order.id} 吗？`)) {
      return;
    }

    this.isLoading = true;
    this.statusMessage = "";

    try {
      const response = await ajax(`/qd/shop/admin/orders/${order.id}`, {
        type: "DELETE"
      });

      if (response.status === "success") {
        // 从列表中移除订单
        const orderIndex = this.model.orders.findIndex(o => o.id === order.id);
        if (orderIndex !== -1) {
          this.model.orders.splice(orderIndex, 1);
          this.notifyPropertyChange('model');
        }
        
        this.statusMessage = "订单删除成功！";
        
        setTimeout(() => {
          this.statusMessage = "";
        }, 3000);
      } else {
        this.statusMessage = response.message || "删除失败";
      }
    } catch (error) {
      console.error("删除订单失败:", error);
      this.statusMessage = "删除失败：" + (error.message || "网络错误");
    } finally {
      this.isLoading = false;
    }
  }

  @action
  async refreshOrders() {
    this.isLoading = true;
    this.statusMessage = "";
    
    try {
      console.log("🔄 刷新管理员订单列表");
      
      // 重新加载当前路由
      this.router.refresh();
      
      console.log("✅ 页面刷新成功");
    } catch (error) {
      console.error("❌ 刷新页面失败:", error);
      this.statusMessage = "刷新失败: " + (error.message || "网络错误");
    } finally {
      this.isLoading = false;
    }
  }

  @action
  stopPropagation(event) {
    event.stopPropagation();
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
  getUserAvatar(avatarTemplate) {
    if (!avatarTemplate) return "/images/avatar.png";
    return avatarTemplate.replace("{size}", "45");
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
}
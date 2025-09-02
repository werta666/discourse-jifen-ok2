import Controller from "@ember/controller";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { ajax } from "discourse/lib/ajax";

export default class QdShopAdminOrdersController extends Controller {
  @service router;
  @tracked isLoading = false;
  @tracked selectedOrder = null;
  @tracked showStatusModal = false;
  @tracked newStatus = "";
  @tracked adminNotes = "";
  @tracked statusMessage = "";

  get totalOrders() {
    return this.model?.pagination?.total_count || 0;
  }

  get pendingOrders() {
    if (!this.model?.orders) return 0;
    return this.model.orders.filter(order => order.status === "pending").length;
  }

  get completedOrders() {
    if (!this.model?.orders) return 0;
    return this.model.orders.filter(order => order.status === "completed").length;
  }

  get cancelledOrders() {
    if (!this.model?.orders) return 0;
    return this.model.orders.filter(order => order.status === "cancelled").length;
  }

  @action
  goBackToShop() {
    this.router.transitionTo("qd-shop");
  }

  @action
  refreshOrders() {
    this.isLoading = true;
    this.refresh().finally(() => {
      this.isLoading = false;
    });
  }

  @action
  showUpdateStatusModal(order) {
    this.selectedOrder = order;
    this.newStatus = order.status;
    this.adminNotes = "";
    this.showStatusModal = true;
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
  async updateOrderStatus() {
    if (!this.selectedOrder || !this.newStatus) return;

    this.isLoading = true;
    this.statusMessage = "";

    try {
      const response = await ajax(`/qd/shop/admin/orders/${this.selectedOrder.id}/status`, {
        type: "PATCH",
        data: {
          status: this.newStatus,
          admin_notes: this.adminNotes
        }
      });

      if (response.status === "success") {
        this.statusMessage = "订单状态更新成功！";
        
        // 更新本地数据
        const orderIndex = this.model.orders.findIndex(o => o.id === this.selectedOrder.id);
        if (orderIndex !== -1) {
          this.model.orders[orderIndex].status = this.newStatus;
          this.model.orders[orderIndex].updated_at = new Date().toISOString();
        }

        setTimeout(() => {
          this.closeStatusModal();
        }, 1500);
      } else {
        this.statusMessage = response.message || "更新失败";
      }
    } catch (error) {
      console.error("更新订单状态失败:", error);
      this.statusMessage = "更新失败：" + (error.message || "网络错误");
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
  getUserAvatar(avatarTemplate) {
    if (!avatarTemplate) return "/images/avatar.png";
    return avatarTemplate.replace("{size}", "45");
  }
}
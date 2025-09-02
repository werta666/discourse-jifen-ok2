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
  @tracked currentFilter = "all";
  @tracked currentPage = 1;
  @tracked pageSize = 8;
  @tracked currentFilter = "all";
  @tracked currentPage = 1;
  @tracked pageSize = 8;

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

  get allOrders() {
    return this.model?.orders || [];
  }

  get filteredOrders() {
    if (this.currentFilter === "all") {
      return this.allOrders;
    }
    return this.allOrders.filter(order => order.status === this.currentFilter);
  }

  get paginatedOrders() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredOrders.slice(startIndex, endIndex);
  }

  get totalPages() {
    return Math.ceil(this.filteredOrders.length / this.pageSize);
  }

  get hasMultiplePages() {
    return this.totalPages > 1;
  }

  get hasPreviousPage() {
    return this.currentPage > 1;
  }

  get hasNextPage() {
    return this.currentPage < this.totalPages;
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
  setFilter(filter) {
    this.currentFilter = filter;
    this.currentPage = 1; // 重置到第一页
  }

  @action
  goToPage(page) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  @action
  previousPage() {
    if (this.hasPreviousPage) {
      this.currentPage--;
    }
  }

  @action
  nextPage() {
    if (this.hasNextPage) {
      this.currentPage++;
    }
  }

  @action
  async deleteOrder(order) {
    if (!confirm(`确定要删除订单 #${order.id} 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const response = await ajax(`/qd/shop/admin/orders/${order.id}`, {
        type: "DELETE"
      });

      if (response.status === "success") {
        alert("✅ " + response.message);
        // 从本地数据中移除订单
        const orderIndex = this.model.orders.findIndex(o => o.id === order.id);
        if (orderIndex !== -1) {
          this.model.orders.splice(orderIndex, 1);
        }
      } else {
        alert("❌ " + response.message);
      }
    } catch (error) {
      console.error("删除订单失败:", error);
      alert("❌ 删除订单失败：" + (error.message || "网络错误"));
    }
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
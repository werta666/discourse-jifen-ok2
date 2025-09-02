import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";

export default class QdShopOrdersController extends Controller {
  @tracked selectedOrder = null;

  @action
  showOrderDetail(order) {
    this.selectedOrder = order;
  }

  @action
  closeOrderDetail() {
    this.selectedOrder = null;
  }

  get formattedOrders() {
    return this.model.orders.map(order => ({
      ...order,
      formattedDate: new Date(order.created_at).toLocaleString('zh-CN'),
      statusText: this.getStatusText(order.status)
    }));
  }

  getStatusText(status) {
    const statusMap = {
      'completed': '已完成',
      'pending': '处理中',
      'failed': '失败',
      'cancelled': '已取消'
    };
    return statusMap[status] || '未知';
  }
}
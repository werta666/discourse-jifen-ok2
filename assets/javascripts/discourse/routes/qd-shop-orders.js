import Route from "@ember/routing/route";
import { ajax } from "discourse/lib/ajax";

export default class QdShopOrdersRoute extends Route {
  model() {
    return ajax("/qd/shop/orders").then(response => {
      return {
        orders: response.data.orders || [],
        totalSpent: response.data.totalSpent || 0
      };
    }).catch(() => {
      return {
        orders: [],
        totalSpent: 0
      };
    });
  }
}
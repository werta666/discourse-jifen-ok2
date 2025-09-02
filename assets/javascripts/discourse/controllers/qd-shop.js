import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";

export default class QdShopController extends Controller {
  @service router;
  @tracked selectedProduct = null;
  @tracked showPurchaseModal = false;
  @tracked showAdminModal = false;
  @tracked purchaseQuantity = 1;
  @tracked purchaseRemark = "";
  @tracked isLoading = false;
  @tracked showSuccessPopup = false;
  @tracked successMessage = "";
  
  // 管理员添加商品表单
  @tracked newProduct = {
    name: "",
    description: "",
    icon_class: "fa-gift",
    price: 100,
    stock: 50,
    sort_order: 0
  };

  // 管理员界面状态
  @tracked adminActiveTab = "add";
  @tracked editingProduct = null;

  constructor() {
    super(...arguments);
    this.resetNewProduct();
  }

  @action
  showProductDetail(product) {
    console.log("🛒 显示商品详情:", product);
    this.selectedProduct = product;
    this.purchaseQuantity = 1;
    this.purchaseRemark = "";
    this.showPurchaseModal = true;
  }

  @action
  closePurchaseModal() {
    console.log("❌ 关闭购买模态框");
    this.showPurchaseModal = false;
    this.selectedProduct = null;
  }

  @action
  updatePurchaseQuantity(event) {
    const quantity = parseInt(event.target.value) || 1;
    const maxQuantity = this.selectedProduct?.stock || 1;
    
    console.log(`📝 手动输入数量: ${quantity}, 最大库存: ${maxQuantity}`);
    
    if (quantity > 0 && quantity <= maxQuantity) {
      this.purchaseQuantity = quantity;
    } else if (quantity > maxQuantity) {
      this.purchaseQuantity = maxQuantity;
      event.target.value = maxQuantity;
    } else {
      this.purchaseQuantity = 1;
      event.target.value = 1;
    }
    
    console.log(`📝 最终数量: ${this.purchaseQuantity}`);
  }

  @action
  updatePurchaseNotes(event) {
    this.purchaseRemark = event.target.value;
    console.log(`📝 更新备注: ${this.purchaseRemark}`);
  }

  @action
  increaseQuantity() {
    console.log("➕ 增加数量按钮被点击");
    if (this.selectedProduct && this.purchaseQuantity < this.selectedProduct.stock) {
      this.purchaseQuantity++;
      console.log(`➕ 数量增加到: ${this.purchaseQuantity}`);
    } else {
      console.log("➕ 已达到最大库存限制");
    }
  }

  @action
  decreaseQuantity() {
    console.log("➖ 减少数量按钮被点击");
    if (this.purchaseQuantity > 1) {
      this.purchaseQuantity--;
      console.log(`➖ 数量减少到: ${this.purchaseQuantity}`);
    } else {
      console.log("➖ 已达到最小数量限制");
    }
  }

  @action
  async confirmPurchase() {
    console.log("🛒 确认购买按钮被点击");
    
    if (!this.selectedProduct) {
      console.log("❌ 没有选中的商品");
      alert("❌ 没有选中的商品");
      return;
    }
    
    if (this.isLoading) {
      console.log("⏳ 正在处理中，跳过重复点击");
      return;
    }
    
    console.log(`🛒 开始购买: ${this.selectedProduct.name} x${this.purchaseQuantity}`);
    this.isLoading = true;
    
    try {
      const purchaseData = {
        product_id: this.selectedProduct.id,
        quantity: this.purchaseQuantity,
        user_note: this.purchaseRemark || ""
      };
      
      console.log("🛒 发送购买请求:", purchaseData);
      
      const result = await ajax("/qd/shop/purchase", {
        type: "POST",
        data: purchaseData
      });
      
      console.log("🛒 购买响应:", result);
      
      if (result.status === "success") {
        // 更新用户积分显示
        if (result.data && result.data.remaining_points !== undefined) {
          this.model.userPoints = result.data.remaining_points;
        }
        
        // 显示绿色主题成功消息
        this.showSuccessMessage('购买成功！');
        
        this.closePurchaseModal();
        
        // 刷新商品列表
        this.refreshProducts();
      } else {
        console.log("❌ 购买失败:", result.message);
        alert(`❌ ${result.message || "购买失败"}`);
      }
      
    } catch (error) {
      console.error("🛒 购买异常:", error);
      const errorMessage = error.jqXHR?.responseJSON?.message || "购买失败，请稍后重试";
      alert(`❌ ${errorMessage}`);
    } finally {
      this.isLoading = false;
      console.log("🛒 购买流程结束");
    }
  }

  @action
  refreshProducts() {
    // 刷新页面数据
    window.location.reload();
  }

  get totalPrice() {
    if (!this.selectedProduct) return 0;
    return this.selectedProduct.price * this.purchaseQuantity;
  }

  get canAfford() {
    return this.model.userPoints >= this.totalPrice;
  }
  
  // 管理员功能
  @action
  showAdminPanel() {
    this.showAdminModal = true;
  }
  
  @action
  closeAdminModal() {
    this.showAdminModal = false;
    this.resetNewProduct();
    this.editingProduct = null;
    this.adminActiveTab = "add";
  }
  
  @action
  updateNewProduct(field, event) {
    let value = event.target.value;
    
    // 对数字字段进行类型转换
    if (field === 'price' || field === 'stock' || field === 'sort_order') {
      value = parseInt(value) || 0;
    }
    
    // 直接赋值，@tracked 会自动处理响应式更新
    this.newProduct[field] = value;
  }
  
  @action
  async addProduct() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const result = await ajax("/qd/shop/add_product", {
        type: "POST",
        data: {
          product: this.newProduct
        }
      });
      
      if (result.status === "success") {
        alert(`✅ ${result.message}`);
        this.closeAdminModal();
        // 刷新页面数据
        window.location.reload();
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      const errorMessage = error.jqXHR?.responseJSON?.message || "添加商品失败，请重试";
      alert(`❌ ${errorMessage}`);
    } finally {
      this.isLoading = false;
    }
  }
  
  @action
  async createSampleData() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const result = await ajax("/qd/shop/create_sample", {
        type: "POST"
      });
      
      if (result.status === "success") {
        alert(`✅ ${result.message}\n创建了 ${result.created_count} 个商品`);
        this.closeAdminModal();
        // 刷新页面数据
        window.location.reload();
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      const errorMessage = error.jqXHR?.responseJSON?.message || "创建示例数据失败，请重试";
      alert(`❌ ${errorMessage}`);
    } finally {
      this.isLoading = false;
    }
  }
  
  @action
  resetNewProduct() {
    this.newProduct = {
      name: "",
      description: "",
      icon_class: "fa-gift",
      price: 100,
      stock: 50,
      sort_order: 0
    };
  }

  @action
  stopPropagation(event) {
    event.stopPropagation();
  }

  // 管理员功能
  @action
  setAdminTab(tab) {
    this.adminActiveTab = tab;
  }

  @action
  editProduct(product) {
    // 深拷贝商品数据，确保所有字段都被正确复制
    this.editingProduct = {
      id: product.id,
      name: product.name || "",
      description: product.description || "",
      icon_class: product.icon_class || "fa-gift",
      price: product.price || 0,
      stock: product.stock || 0,
      sort_order: product.sort_order || 0
    };
    
    this.adminActiveTab = "edit";
    this.showAdminModal = true;
  }

  @action
  async updateProduct() {
    if (this.isLoading || !this.editingProduct) {
      return;
    }
    
    this.isLoading = true;
    
    try {
      const productData = {
        name: this.editingProduct.name,
        description: this.editingProduct.description,
        icon_class: this.editingProduct.icon_class,
        price: parseInt(this.editingProduct.price) || 0,
        stock: parseInt(this.editingProduct.stock) || 0,
        sort_order: parseInt(this.editingProduct.sort_order) || 0
      };
      
      const result = await ajax(`/qd/shop/products/${this.editingProduct.id}`, {
        type: "PUT",
        data: {
          product: productData
        }
      });
      
      if (result.status === "success") {
        alert(`✅ ${result.message}`);
        
        // 更新本地商品列表数据
        const productIndex = this.model.products.findIndex(p => p.id === this.editingProduct.id);
        if (productIndex !== -1) {
          this.model.products[productIndex] = { ...this.model.products[productIndex], ...result.data };
          this.notifyPropertyChange('model');
        }
        
        // 重置编辑状态并切换到管理标签页
        this.editingProduct = null;
        this.adminActiveTab = "manage";
      } else {
        alert(`❌ ${result.message || "更新失败"}`);
      }
    } catch (error) {
      const errorMessage = error.jqXHR?.responseJSON?.message || "更新商品失败，请重试";
      alert(`❌ ${errorMessage}`);
    } finally {
      this.isLoading = false;
    }
  }

  @action
  updateEditingProduct(field, event) {
    let value = event.target.value;
    
    if (field === 'price' || field === 'stock' || field === 'sort_order') {
      value = parseInt(value) || 0;
    }
    
    // 确保 editingProduct 存在
    if (!this.editingProduct) {
      this.editingProduct = {};
    }
    
    this.editingProduct[field] = value;
  }

  @action
  async deleteProduct(product) {
    if (!confirm(`确定要删除商品 "${product.name}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const result = await ajax(`/qd/shop/products/${product.id}`, {
        type: "DELETE"
      });

      if (result.status === "success") {
        alert(`✅ ${result.message}`);
        // 刷新页面数据
        window.location.reload();
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      const errorMessage = error.jqXHR?.responseJSON?.message || "删除商品失败，请重试";
      alert(`❌ ${errorMessage}`);
    }
  }

  @action
  goToAdminOrders() {
    this.router.transitionTo("qd-shop-admin-orders");
  }

  @action
  showSuccessMessage(message) {
    this.successMessage = message;
    this.showSuccessPopup = true;
    
    // 3秒后自动隐藏
    setTimeout(() => {
      this.hideSuccessMessage();
    }, 3000);
  }

  @action
  hideSuccessMessage() {
    this.showSuccessPopup = false;
    this.successMessage = "";
  }
}
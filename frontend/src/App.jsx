import React, { useEffect, useMemo, useRef, useState } from "react";
import canvasBackpackImg from "./assets/canvas-backpack.jpg";
import ceramicMugImg from "./assets/ceramic-mug.jpg";
import wirelessHeadphonesImg from "./assets/wireless-headphones.jpg";
import deskLampImg from "./assets/desk-lamp.jpg";
import steelWaterBottleImg from "./assets/steel-water-bottle.jpg";
import notebookSetImg from "./assets/notebook-set.jpg";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const productImages = {
  "canvas-backpack": canvasBackpackImg,
  "ceramic-mug": ceramicMugImg,
  "wireless-headphones": wirelessHeadphonesImg,
  "desk-lamp": deskLampImg,
  "steel-water-bottle": steelWaterBottleImg,
  "notebook-set": notebookSetImg,
};

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [justAddedId, setJustAddedId] = useState(null);

  const cartTriggerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const wasCartOpen = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`The shop API returned ${response.status}.`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("The shop API returned an unexpected response.");
        }
        setProducts(data);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setError(fetchError.message || "Could not load products.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();
    return () => controller.abort();
  }, []);

  // Handle focus management and Escape key for cart drawer
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && cartOpen) {
        setCartOpen(false);
      }
    }

    if (cartOpen) {
      window.addEventListener("keydown", handleKeyDown);
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else if (wasCartOpen.current) {
      cartTriggerRef.current?.focus();
    }
    wasCartOpen.current = cartOpen;
  }, [cartOpen]);

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  const cartTotal = useMemo(
    () =>
      products.reduce(
        (sum, product) =>
          sum + Number(product.price) * (cart[product.id] || 0),
        0,
      ),
    [products, cart],
  );

  // Extract real categories from products returned by the API
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ["All", ...cats];
  }, [products]);

  // Category counts based on real products
  const categoryCounts = useMemo(() => {
    const counts = { All: products.length };
    for (const p of products) {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    }
    return counts;
  }, [products]);

  // Combined client-side category filtering, keyword searching, and price/name sorting
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products];

    // 1. Category Filter
    if (selectedCategory !== "All") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // 2. Keyword Search
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((p) => {
        const nameMatch = p.name ? p.name.toLowerCase().includes(query) : false;
        const descMatch = p.description ? p.description.toLowerCase().includes(query) : false;
        const catMatch = p.category ? p.category.toLowerCase().includes(query) : false;
        return nameMatch || descMatch || catMatch;
      });
    }

    // 3. Sorting
    if (sortBy === "price-asc") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  function addToCart(productId) {
    setCart((current) => ({
      ...current,
      [productId]: (current[productId] || 0) + 1,
    }));
    setJustAddedId(productId);
    setTimeout(() => {
      setJustAddedId((current) => (current === productId ? null : current));
    }, 1200);
  }

  function changeQuantity(productId, adjustment) {
    setCart((current) => {
      const nextQuantity = (current[productId] || 0) + adjustment;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: nextQuantity };
    });
  }

  const cartProducts = products.filter((product) => cart[product.id]);
  const featuredProduct = products[0];

  return (
    <div className="app-shell" id="top">
      {/* Header with logo, Shop, Our Story, and Cart access */}
      <header className="site-header">
        <div className="header-container">
          <a className="brand" href="/" aria-label="Common Goods home">
            <span className="brand-badge">CG</span>
            <span className="brand-name">common goods</span>
          </a>

          <nav className="header-nav" aria-label="Main navigation">
            <a href="#shop" className="nav-link">Shop</a>
            <a href="#categories" className="nav-link">Categories</a>
            <a href="#story" className="nav-link">Our Story</a>
            <a href="#philosophy" className="nav-link">Philosophy</a>
          </nav>

          <button
            ref={cartTriggerRef}
            className="cart-trigger"
            type="button"
            aria-expanded={cartOpen}
            aria-controls="cart-panel"
            onClick={() => setCartOpen((open) => !open)}
          >
            <svg
              className="cart-trigger-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="cart-trigger-label">Bag</span>
            <span className="cart-badge" aria-label={`${cartCount} items in bag`}>
              {cartCount}
            </span>
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-container">
            <div className="hero-copy">
              <div className="hero-pill">
                <span className="pill-dot" aria-hidden="true"></span>
                <span>Curated Everyday Essentials</span>
              </div>
              <h1 className="hero-title">
                Thoughtfully designed essentials for intentional living.
              </h1>
              <p className="hero-description">
                A minimal collection of durable, everyday items designed for work,
                home, and rituals in between. Built simply, priced honestly.
              </p>
              <div className="hero-actions">
                <a className="primary-button" href="#shop">
                  Shop the Collection
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                </a>
                <a className="secondary-button-link" href="#story">
                  Our Story →
                </a>
              </div>
            </div>

            <div className="hero-visual" aria-label="Featured everyday product">
              <div className="showcase-card">
                <div className="showcase-header">
                  <span className="showcase-label">Featured Essential</span>
                  <span className="showcase-tag">In Stock</span>
                </div>
                <div className="showcase-stage">
                  {featuredProduct && productImages[featuredProduct.slug] ? (
                    <img
                      src={productImages[featuredProduct.slug]}
                      alt={featuredProduct.name}
                      className="showcase-image"
                    />
                  ) : (
                    <span className="showcase-emoji" aria-hidden="true">
                      {featuredProduct ? featuredProduct.emoji : "🎒"}
                    </span>
                  )}
                </div>
                <div className="showcase-footer">
                  <div>
                    <h3 className="showcase-name">
                      {featuredProduct ? featuredProduct.name : "Canvas Backpack"}
                    </h3>
                    <p className="showcase-category">
                      {featuredProduct ? featuredProduct.category : "Everyday"}
                    </p>
                  </div>
                  <span className="showcase-price">
                    {featuredProduct ? money.format(Number(featuredProduct.price)) : "$39.99"}
                  </span>
                </div>
              </div>

              <div className="hero-metric-badge">
                <div className="metric-icon" aria-hidden="true">✓</div>
                <div>
                  <strong>Pure Utility</strong>
                  <span>Everyday quality, verified craft</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Shop by Category */}
        <section className="category-section" id="categories">
          <div className="section-container">
            <div className="section-header">
              <div>
                <p className="section-eyebrow">BROWSE BY CATEGORY</p>
                <h2 className="section-title">Shop by Category</h2>
              </div>
              <p className="section-subtitle">
                {products.length} products organized across {Math.max(categories.length - 1, 0)} categories
              </p>
            </div>

            <div className="category-card-grid" role="tablist" aria-label="Product categories">
              {categories.map((category) => {
                const isActive = selectedCategory === category;
                const count = categoryCounts[category] || 0;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`category-card-btn ${isActive ? "category-card-btn-active" : ""}`}
                    onClick={() => {
                      setSelectedCategory(category);
                      const shopEl = document.getElementById("shop");
                      if (shopEl) {
                        shopEl.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    <span className="category-card-name">
                      {category === "All" ? "All Products" : category}
                    </span>
                    <span className="category-card-count">
                      {count} {count === 1 ? "item" : "items"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Product Collection with Client-side Search and Price Sorting */}
        <section className="shop-section" id="shop">
          <div className="section-container">
            <div className="section-header">
              <div>
                <p className="section-eyebrow">THE COLLECTION</p>
                <h2 className="section-title">
                  {selectedCategory === "All" ? "All Products" : `${selectedCategory} Goods`}
                </h2>
              </div>
              <p className="section-subtitle">
                Showing {filteredAndSortedProducts.length} of {products.length} items
              </p>
            </div>

            {/* Filter, Search, and Sort Toolbar */}
            <div className="collection-toolbar">
              <div className="search-control">
                <svg
                  className="search-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search products by name or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search products by name, description, or category"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search input"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="sort-control">
                <label htmlFor="sort-select" className="sort-label">Sort by:</label>
                <select
                  id="sort-select"
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort products by price or name"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
            </div>

            {loading && (
              <div className="message-box" role="status">
                <span className="spinner" aria-hidden="true" />
                <span>Loading products from API...</span>
              </div>
            )}

            {!loading && error && (
              <div className="message-box message-box-error" role="alert">
                <div className="error-title">Unable to load the shop</div>
                <p>{error}</p>
                <p className="error-hint">
                  Ensure the API and database services are running, then refresh this page.
                </p>
              </div>
            )}

            {!loading && !error && products.length === 0 && (
              <div className="message-box">
                <p>No products are currently available in the catalogue.</p>
              </div>
            )}

            {!loading && !error && products.length > 0 && filteredAndSortedProducts.length === 0 && (
              <div className="message-box">
                <div className="no-results-icon" aria-hidden="true">🔍</div>
                <div className="no-results-title">No matching products found</div>
                <p>
                  We couldn't find anything matching "{searchQuery}"
                  {selectedCategory !== "All" ? ` in category "${selectedCategory}"` : ""}.
                </p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                >
                  Reset all filters
                </button>
              </div>
            )}

            {!loading && !error && filteredAndSortedProducts.length > 0 && (
              <div className="product-grid">
                {filteredAndSortedProducts.map((product) => {
                  const isJustAdded = justAddedId === product.id;
                  const itemInCart = cart[product.id] || 0;
                  const imageSrc = productImages[product.slug];

                  return (
                    <article className="product-card" key={product.id}>
                      <div className="card-stage">
                        <span className="card-category">{product.category}</span>
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={product.name}
                            className="card-product-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="card-emoji-container">
                            <span className="card-emoji" aria-hidden="true">
                              {product.emoji}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="card-content">
                        <div className="card-title-row">
                          <h3 className="card-title">{product.name}</h3>
                          <span className="card-price">
                            {money.format(Number(product.price))}
                          </span>
                        </div>

                        <p className="card-description">{product.description}</p>

                        <div className="card-action-row">
                          <button
                            type="button"
                            className={`add-button ${isJustAdded ? "add-button-added" : ""}`}
                            aria-label={`Add ${product.name} to bag`}
                            onClick={() => addToCart(product.id)}
                          >
                            {isJustAdded ? (
                              <span className="add-button-content">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Added to bag
                              </span>
                            ) : (
                              <span className="add-button-content">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden="true"
                                >
                                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                                  <path d="M3 6h18" />
                                  <path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                                {itemInCart > 0 ? `Add another (${itemInCart})` : "Add to bag"}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Our Story */}
        <section className="story-section" id="story">
          <div className="section-container">
            <div className="story-grid">
              <div className="story-content">
                <p className="section-eyebrow">OUR STORY</p>
                <h2 className="story-title">
                  Quiet quality for the rituals of everyday life.
                </h2>
                <div className="story-paragraphs">
                  <p>
                    We believe the objects we keep close should be simple, functional,
                    and built to endure. Common Goods was designed around a straightforward
                    idea: focus on durable everyday essentials that do their job with quiet
                    reliability rather than chasing short-lived trends.
                  </p>
                  <p>
                    From the morning coffee mug on your desk to the canvas backpack you take
                    on your commute, each item in our collection is curated to bring clarity,
                    utility, and thoughtful craft into your daily routine.
                  </p>
                </div>
                <div className="story-features-list">
                  <div className="story-feature-point">
                    <span className="feature-check" aria-hidden="true">✓</span>
                    <span>Curated selection of durable essentials</span>
                  </div>
                  <div className="story-feature-point">
                    <span className="feature-check" aria-hidden="true">✓</span>
                    <span>Honest materials built for routine use</span>
                  </div>
                  <div className="story-feature-point">
                    <span className="feature-check" aria-hidden="true">✓</span>
                    <span>Practical design with zero unnecessary clutter</span>
                  </div>
                </div>
              </div>

              <div className="story-visual-card">
                <div className="story-quote-box">
                  <span className="quote-mark" aria-hidden="true">“</span>
                  <p className="story-quote">
                    Good design is as little design as possible. Just the essentials,
                    done right.
                  </p>
                  <span className="story-quote-cite">— Common Goods Design Ethos</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Philosophy: 3 Concise Design Principles */}
        <section className="philosophy-section" id="philosophy">
          <div className="section-container">
            <div className="section-header section-header-centered">
              <p className="section-eyebrow">DESIGN PRINCIPLES</p>
              <h2 className="section-title">Our Philosophy</h2>
              <p className="section-subtitle">
                Core principles guiding every item in our catalogue.
              </p>
            </div>

            <div className="philosophy-grid">
              <div className="philosophy-card">
                <div className="philosophy-icon" aria-hidden="true">📐</div>
                <h3 className="philosophy-card-title">Useful by Design</h3>
                <p className="philosophy-card-desc">
                  Every product is selected for clear utility and timeless form.
                  No extraneous decoration or superficial features—just items that
                  perform their function smoothly.
                </p>
              </div>

              <div className="philosophy-card">
                <div className="philosophy-icon" aria-hidden="true">🌿</div>
                <h3 className="philosophy-card-title">Simple Everyday Living</h3>
                <p className="philosophy-card-desc">
                  We focus on objects that quietly support daily rituals. Minimalist
                  aesthetics that reduce visual noise and bring ease to your workspace and home.
                </p>
              </div>

              <div className="philosophy-card">
                <div className="philosophy-icon" aria-hidden="true">⚖️</div>
                <h3 className="philosophy-card-title">Thoughtful Shopping</h3>
                <p className="philosophy-card-desc">
                  We believe in fair value and straightforward representation. No
                  artificial urgency, no inflated claims, and no surprises.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Cart Drawer */}
      {cartOpen && (
        <div
          className="cart-backdrop"
          onClick={() => setCartOpen(false)}
          role="presentation"
        >
          <aside
            className="cart-panel"
            id="cart-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-header">
              <div className="cart-header-title">
                <h2>Your Bag</h2>
                <span className="cart-count-pill">{cartCount} items</span>
              </div>
              <button
                ref={closeButtonRef}
                className="cart-close-button"
                type="button"
                aria-label="Close shopping bag"
                onClick={() => setCartOpen(false)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {cartProducts.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon" aria-hidden="true">
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <h3>Your bag is empty</h3>
                <p>Explore our catalog of everyday essentials to add your first item.</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setCartOpen(false)}
                >
                  Browse Essentials
                </button>
              </div>
            ) : (
              <div className="cart-content">
                <div className="cart-items" role="list">
                  {cartProducts.map((product) => {
                    const quantity = cart[product.id];
                    const itemTotal = Number(product.price) * quantity;
                    const itemImage = productImages[product.slug];

                    return (
                      <div className="cart-item" key={product.id} role="listitem">
                        <div className="cart-item-stage" aria-hidden="true">
                          {itemImage ? (
                            <img
                              src={itemImage}
                              alt=""
                              className="cart-item-image"
                            />
                          ) : (
                            <span className="cart-item-emoji">{product.emoji}</span>
                          )}
                        </div>

                        <div className="cart-item-details">
                          <div className="cart-item-name-row">
                            <strong className="cart-item-name">{product.name}</strong>
                            <span className="cart-item-total">{money.format(itemTotal)}</span>
                          </div>

                          <div className="cart-item-meta">
                            <span className="cart-item-unit-price">
                              {money.format(Number(product.price))} each
                            </span>

                            <div className="cart-item-controls">
                              <div
                                className="quantity-stepper"
                                aria-label={`Quantity for ${product.name}`}
                              >
                                <button
                                  type="button"
                                  className="stepper-button"
                                  aria-label={`Decrease quantity of ${product.name}`}
                                  onClick={() => changeQuantity(product.id, -1)}
                                >
                                  −
                                </button>
                                <span className="stepper-value" aria-live="polite">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  className="stepper-button"
                                  aria-label={`Increase quantity of ${product.name}`}
                                  onClick={() => changeQuantity(product.id, 1)}
                                >
                                  +
                                </button>
                              </div>

                              <button
                                type="button"
                                className="remove-item-button"
                                aria-label={`Remove all ${product.name} from bag`}
                                onClick={() => changeQuantity(product.id, -quantity)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <strong className="summary-amount">{money.format(cartTotal)}</strong>
                  </div>
                  <div className="summary-row summary-row-subtle">
                    <span>Shipping</span>
                    <span className="summary-shipping">Free (Demo)</span>
                  </div>

                  <div className="cart-actions">
                    <button
                      type="button"
                      className="checkout-button"
                      disabled
                      aria-disabled="true"
                    >
                      Proceed to Demo Checkout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-brand-col">
            <a className="brand" href="/" aria-label="Common Goods home">
              <span className="brand-badge">CG</span>
              <span className="brand-name">common goods</span>
            </a>
            <p className="footer-tagline">
              Simple, durable essentials designed for intentional everyday living.
            </p>
          </div>

          <div className="footer-nav-col">
            <h4 className="footer-heading">Navigation</h4>
            <div className="footer-links">
              <a href="#shop" className="footer-link">The Collection</a>
              <a href="#categories" className="footer-link">Categories</a>
              <a href="#story" className="footer-link">Our Story</a>
              <a href="#philosophy" className="footer-link">Philosophy</a>
              <button
                type="button"
                className="footer-link footer-cart-btn"
                onClick={() => setCartOpen(true)}
              >
                Shopping Bag ({cartCount})
              </button>
              <a
                href="#top"
                className="footer-link"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Back to top ↑
              </a>
            </div>
          </div>

          <div className="footer-notice-col">
            <h4 className="footer-heading">Demo Project Notice</h4>
            <div className="demo-notice-box">
              <p className="demo-notice-text">
                Common Goods is an illustrative demo storefront built for an academic
                full-stack Docker practical. The system runs React + Vite frontend,
                Node.js/Express API, and PostgreSQL database within containerized Docker services.
                No real payments, commercial orders, or user tracking are performed.
              </p>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Common Goods. All rights reserved.</span>
          <span>Full-Stack Architecture: React 18 · Express API · PostgreSQL 16 · Docker Compose</span>
        </div>
      </footer>
    </div>
  );
}

export default App;

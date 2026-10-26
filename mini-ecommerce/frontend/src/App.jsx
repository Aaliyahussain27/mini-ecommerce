import { useEffect, useMemo, useState } from "react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

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

  function addToCart(productId) {
    setCart((current) => ({
      ...current,
      [productId]: (current[productId] || 0) + 1,
    }));
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

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Common Goods home">
          <span className="brand-mark">c.</span>
          <span>common goods</span>
        </a>
        <nav className="header-nav" aria-label="Main navigation">
          <a href="#shop">The shop</a>
          <a href="#story">Our little idea</a>
        </nav>
        <button
          className="cart-trigger"
          type="button"
          aria-expanded={cartOpen}
          aria-controls="cart-panel"
          onClick={() => setCartOpen((open) => !open)}
        >
          <span className="cart-icon" aria-hidden="true">
            ♧
          </span>
          Bag <span className="cart-badge">{cartCount}</span>
        </button>
      </header>

      <main>
        <section className="hero" id="story">
          <div className="hero-copy">
            <p className="eyebrow">GOOD THINGS, MADE SIMPLE</p>
            <h1>A little something for your every day.</h1>
            <p className="hero-description">
              Useful, lovely things for the everyday rituals that make a day.
              Thoughtfully picked, ready to make your own.
            </p>
            <a className="primary-link" href="#shop">
              Find your thing <span aria-hidden="true">↘</span>
            </a>
          </div>
          <div className="hero-art" aria-label="A collection of everyday goods">
            <div className="sun-shape" />
            <div className="hero-note">small joys<br />live here</div>
            <span className="hero-object hero-cup" aria-hidden="true">☕</span>
            <span className="hero-object hero-flower" aria-hidden="true">✿</span>
            <span className="hero-object hero-spark" aria-hidden="true">✳</span>
            <span className="hero-caption">a good day starts somewhere</span>
          </div>
          <div className="hero-bottom-line">
            <span>MADE FOR THE MOMENTS IN BETWEEN</span>
            <span>SCROLL A LITTLE <span aria-hidden="true">↓</span></span>
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A FEW FAVORITES</p>
              <h2>Meet the little things.</h2>
            </div>
            <p className="section-note">Good design, useful every day.</p>
          </div>

          {loading && (
            <div className="message-card" role="status">
              <span className="loader" aria-hidden="true" />
              Finding the good things...
            </div>
          )}
          {!loading && error && (
            <div className="message-card error-message" role="alert">
              <strong>We couldn’t load the shop.</strong>
              <span>{error} Check that the API and database are running, then refresh.</span>
            </div>
          )}
          {!loading && !error && products.length === 0 && (
            <div className="message-card">No products are available right now.</div>
          )}
          {!loading && !error && products.length > 0 && (
            <div className="product-grid">
              {products.map((product, index) => (
                <article className="product-card" key={product.id}>
                  <div className={`product-art art-${index % 6}`}>
                    <span className="product-category">{product.category}</span>
                    <span className="product-emoji" aria-hidden="true">
                      {product.emoji}
                    </span>
                    <span className="art-decoration" aria-hidden="true">
                      {index % 2 === 0 ? "✳" : "✿"}
                    </span>
                    <button
                      className="quick-add"
                      type="button"
                      aria-label={`Add ${product.name} to bag`}
                      onClick={() => addToCart(product.id)}
                    >
                      +
                    </button>
                  </div>
                  <div className="product-details">
                    <div className="product-title-row">
                      <h3>{product.name}</h3>
                      <span className="product-price">{money.format(Number(product.price))}</span>
                    </div>
                    <p>{product.description}</p>
                    <button
                      className="add-button"
                      type="button"
                      onClick={() => addToCart(product.id)}
                    >
                      Add to bag <span aria-hidden="true">+</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="closing-note">
          <span className="closing-flower" aria-hidden="true">✳</span>
          <p>A little less ordinary, a little more you.</p>
          <span className="closing-caption">GOOD THINGS, EVERY DAY</span>
        </section>
      </main>

      {cartOpen && (
        <div className="cart-backdrop" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-panel"
            id="cart-panel"
            aria-label="Shopping bag"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-heading">
              <div>
                <p className="eyebrow">YOUR LITTLE FINDS</p>
                <h2>Your bag <span>({cartCount})</span></h2>
              </div>
              <button
                className="close-cart"
                type="button"
                aria-label="Close shopping bag"
                onClick={() => setCartOpen(false)}
              >
                ×
              </button>
            </div>
            {cartProducts.length === 0 ? (
              <div className="empty-cart">
                <span aria-hidden="true">✿</span>
                <p>Your bag is taking a little breather.</p>
                <button type="button" onClick={() => setCartOpen(false)}>
                  Have a look around
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cartProducts.map((product) => (
                    <div className="cart-item" key={product.id}>
                      <span className="cart-item-emoji" aria-hidden="true">{product.emoji}</span>
                      <div className="cart-item-info">
                        <strong>{product.name}</strong>
                        <span>{money.format(Number(product.price))}</span>
                        <div className="quantity-control" aria-label={`Quantity of ${product.name}`}>
                          <button
                            type="button"
                            aria-label={`Remove one ${product.name}`}
                            onClick={() => changeQuantity(product.id, -1)}
                          >−</button>
                          <span>{cart[product.id]}</span>
                          <button
                            type="button"
                            aria-label={`Add one ${product.name}`}
                            onClick={() => changeQuantity(product.id, 1)}
                          >+</button>
                        </div>
                      </div>
                      <strong className="line-total">
                        {money.format(Number(product.price) * cart[product.id])}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="cart-total">
                  <span>Subtotal</span>
                  <strong>{money.format(cartTotal)}</strong>
                </div>
                <p className="cart-footnote">Just a demo shop — no checkout, just good finds.</p>
              </>
            )}
          </aside>
        </div>
      )}

      <footer className="site-footer">
        <a className="brand footer-brand" href="/">
          <span className="brand-mark">c.</span>
          <span>common goods</span>
        </a>
        <span>© {new Date().getFullYear()} Common Goods. Made for the everyday.</span>
        <a href="#story">Back to top ↑</a>
      </footer>
    </div>
  );
}

export default App;

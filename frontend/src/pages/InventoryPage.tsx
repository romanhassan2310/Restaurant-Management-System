import { FormEvent, useEffect, useState } from 'react';
import api from '../services/api';

interface Product {
  _id: string;
  name: string;
  sku: string;
  type: string;
  stockQuantity: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [valuation, setValuation] = useState(0);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [operation, setOperation] = useState<'purchase' | 'wastage'>('purchase');
  const [message, setMessage] = useState('');

  const loadInventory = async () => {
    const [productResponse, lowStockResponse, valuationResponse] = await Promise.all([
      api.get('/inventory/products'),
      api.get('/inventory/low-stock'),
      api.get('/inventory/valuation'),
    ]);
    setProducts(productResponse.data.data);
    setLowStock(lowStockResponse.data.data);
    setValuation(valuationResponse.data.data.totalValue);
    if (!productId && productResponse.data.data[0]) setProductId(productResponse.data.data[0]._id);
  };

  useEffect(() => {
    loadInventory().catch(() => setMessage('Unable to load inventory.'));
  }, []);

  const submitOperation = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await api.post(`/inventory/${operation}`, { productId, quantity: Number(quantity) });
      setQuantity('');
      setMessage(`${operation === 'purchase' ? 'Purchase' : 'Wastage'} recorded.`);
      await loadInventory();
    } catch {
      setMessage('The inventory operation could not be completed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Inventory control</p>
          <h2 className="mt-1 text-3xl font-bold text-slate-950">Products & stock</h2>
        </div>
        <div className="rounded-lg bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Inventory valuation</p>
          <p className="text-2xl font-bold text-emerald-950">${valuation.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold">Product catalog</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Selling price</th></tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium">{product.name}<span className="ml-2 text-xs text-slate-400">{product.type}</span></td>
                    <td className="px-5 py-3 text-slate-500">{product.sku}</td>
                    <td className={`px-5 py-3 font-semibold ${product.stockQuantity <= product.reorderLevel ? 'text-amber-700' : 'text-slate-900'}`}>{product.stockQuantity}</td>
                    <td className="px-5 py-3">${product.sellingPrice.toFixed(2)}</td>
                  </tr>
                ))}
                {!products.length && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-500">No products have been added yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl bg-slate-950 p-5 text-white shadow-sm">
            <h3 className="font-semibold">Record stock movement</h3>
            <form onSubmit={submitOperation} className="mt-4 space-y-3">
              <select value={operation} onChange={(event) => setOperation(event.target.value as 'purchase' | 'wastage')} className="w-full rounded border-0 bg-white/10 px-3 py-2 text-white">
                <option value="purchase" className="text-slate-950">Purchase received</option>
                <option value="wastage" className="text-slate-950">Wastage</option>
              </select>
              <select value={productId} onChange={(event) => setProductId(event.target.value)} className="w-full rounded border-0 bg-white/10 px-3 py-2 text-white">
                {products.map((product) => <option key={product._id} value={product._id} className="text-slate-950">{product.name}</option>)}
              </select>
              <input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantity" className="w-full rounded border-0 bg-white/10 px-3 py-2 text-white placeholder:text-slate-400" required />
              <button type="submit" className="w-full rounded bg-emerald-400 px-4 py-2 font-semibold text-emerald-950">Save movement</button>
            </form>
            {message && <p className="mt-3 text-sm text-emerald-200">{message}</p>}
          </section>

          <section className="rounded-xl bg-amber-50 p-5 ring-1 ring-amber-100">
            <h3 className="font-semibold text-amber-950">Low stock alerts</h3>
            <div className="mt-3 space-y-2">
              {lowStock.map((product) => <div key={product._id} className="flex justify-between text-sm text-amber-900"><span>{product.name}</span><span className="font-semibold">{product.stockQuantity} / {product.reorderLevel}</span></div>)}
              {!lowStock.length && <p className="text-sm text-amber-800">All tracked products are above reorder level.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

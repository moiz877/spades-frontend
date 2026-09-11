'use client';

import { Plus, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import type { FeedstockInput, ProcessInputs, UtilityInput } from '@/lib/teaTypes';

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-white/50">{label}</label>
      <input
        type="number"
        step={step ?? 'any'}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono-tabular rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-cyan-400/50"
      />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-white/50">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-cyan-400/50"
      />
    </div>
  );
}

function LineItemRows<T extends FeedstockInput | UtilityInput>({
  title,
  items,
  onChange,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
}) {
  function update(i: number, patch: Partial<T>) {
    onChange(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([
      // quantity_per_year starts at 1, not 0 -- the backend model requires
      // gt=0 and a freshly-added row left at the default value would fail
      // that validation with a confusing raw Pydantic error on submit.
      ...items,
      { name: '', commodity_key: '', quantity_per_year: 1, unit: '', price_override: null, escalation_pct_per_year: 0 } as T,
    ]);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-cyan-400 hover:underline">
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="relative flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-2 top-2 rounded-md p-1 text-white/30 transition hover:text-red-400"
              aria-label={`Remove ${item.name || title.slice(0, -1)}`}
            >
              <Trash size={14} />
            </button>
            <div className="pr-6">
              <TextField label="Name" value={item.name} onChange={(v) => update(i, { name: v } as Partial<T>)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="Commodity key"
                value={item.commodity_key}
                onChange={(v) => update(i, { commodity_key: v } as Partial<T>)}
              />
              <TextField label="Unit" value={item.unit} onChange={(v) => update(i, { unit: v } as Partial<T>)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Qty / year"
                value={item.quantity_per_year}
                onChange={(v) => update(i, { quantity_per_year: v } as Partial<T>)}
              />
              <NumberField
                label="Price override ($/unit)"
                value={item.price_override ?? 0}
                onChange={(v) => update(i, { price_override: v || null } as Partial<T>)}
              />
            </div>
            <NumberField
              label="Price escalation (%/yr)"
              step={0.1}
              value={(item.escalation_pct_per_year ?? 0) * 100}
              onChange={(v) => update(i, { escalation_pct_per_year: v / 100 } as Partial<T>)}
            />
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-white/30">None added yet.</p>}
      </div>
    </div>
  );
}

export function ProcessInputForm({
  value,
  onChange,
  onSubmit,
  submitting,
}: {
  value: ProcessInputs;
  onChange: (v: ProcessInputs) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  function set<K extends keyof ProcessInputs>(key: K, v: ProcessInputs[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <TextField label="Process name" value={value.process_name} onChange={(v) => set('process_name', v)} />

      <div>
        <h3 className="text-sm font-semibold text-white">Capital cost scaling</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumberField label="Reference plant CapEx ($)" value={value.base_capex} onChange={(v) => set('base_capex', v)} />
          <NumberField label="Reference plant capacity" value={value.base_capacity} onChange={(v) => set('base_capacity', v)} />
          <NumberField label="Your plant capacity" value={value.annual_capacity} onChange={(v) => set('annual_capacity', v)} />
          <TextField label="Capacity unit" value={value.capacity_unit} onChange={(v) => set('capacity_unit', v)} />
        </div>
      </div>

      <LineItemRows title="Feedstocks" items={value.feedstocks} onChange={(items) => set('feedstocks', items)} />
      <LineItemRows title="Utilities" items={value.utilities} onChange={(items) => set('utilities', items)} />

      <div>
        <h3 className="text-sm font-semibold text-white">Product & economics</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumberField
            label="Product price ($/unit)"
            value={value.product_price_per_unit}
            onChange={(v) => set('product_price_per_unit', v)}
          />
          <NumberField
            label="Annual volume"
            value={value.product_annual_volume}
            onChange={(v) => set('product_annual_volume', v)}
          />
          <TextField label="Product unit" value={value.product_unit} onChange={(v) => set('product_unit', v)} />
          <NumberField
            label="Price escalation (%/yr)"
            step={0.1}
            value={(value.product_price_escalation_pct ?? 0) * 100}
            onChange={(v) => set('product_price_escalation_pct', v / 100)}
          />
          <NumberField
            label="Fixed annual costs ($)"
            value={value.fixed_annual_costs}
            onChange={(v) => set('fixed_annual_costs', v)}
          />
          <NumberField
            label="Maintenance (% of CapEx)"
            step={0.01}
            value={value.maintenance_pct_of_capex}
            onChange={(v) => set('maintenance_pct_of_capex', v)}
          />
          <NumberField
            label="Working capital (% of CapEx)"
            step={0.01}
            value={value.working_capital_pct_of_capex}
            onChange={(v) => set('working_capital_pct_of_capex', v)}
          />
          <NumberField
            label="Project lifetime (years)"
            value={value.project_lifetime_years}
            onChange={(v) => set('project_lifetime_years', v)}
          />
          <NumberField
            label="Discount rate"
            step={0.01}
            value={value.discount_rate}
            onChange={(v) => set('discount_rate', v)}
          />
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full py-3">
        {submitting ? 'Running...' : 'Run TEA'}
      </Button>
    </form>
  );
}

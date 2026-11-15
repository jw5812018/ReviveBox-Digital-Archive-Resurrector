import type { Item } from '@shared/models/types'
import { formatSavedAgo, type RediscoverRule } from './rediscover'
import { EmptyState } from '@client/app/States'

interface RediscoverPanelProps {
  items: Item[]
  rule: RediscoverRule
  selectedId: string | null
  onSelect: (id: string) => void
}

const RULE_TEXT: Record<RediscoverRule, string> = {
  'older-than-30-days': 'Unread items you saved more than 30 days ago, oldest first.',
  'oldest-unread': 'Nothing older than 30 days — showing your oldest unread items instead.',
  empty: '',
}

/** Rediscover list with explicit rule and per-item reasons (R8 AC2-4). */
export function RediscoverPanel({ items, rule, selectedId, onSelect }: RediscoverPanelProps) {
  if (rule === 'empty' || items.length === 0) {
    return (
      <EmptyState
        title="Nothing to rediscover"
        hint="Save something and leave it unread — it will resurface here later."
      />
    )
  }
  return (
    <div>
      <p className="rediscover-rule">{RULE_TEXT[rule]}</p>
      <ul className="item-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`item-row${selectedId === item.id ? ' is-selected' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <span className="item-row-top">
                <span className="item-title">{item.title}</span>
                {item.isSample && <span className="item-sample">Sample</span>}
              </span>
              <span className="item-meta">
                <span className="rediscover-reason">
                  {formatSavedAgo(item.savedAt)} · Unread
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
import Inventory from '@/lib/models/Inventory';
import InventoryMovement from '@/lib/models/InventoryMovement';
import ProcedureConsumableTemplate from '@/lib/models/ProcedureConsumableTemplate';
import { PROCEDURE_CONSUMABLE_TSV } from '@/lib/procedure-consumable-seed';
import type { ConsultationProcedure } from '@/lib/procedure-types';

export type ConsultationConsumableUsage = {
  name: string;
  quantity: number;
  unit: string;
  procedure: string;
  category: string;
  source: 'standard' | 'actual';
  inventoryItemId?: string;
  availableQuantity?: number;
  hasSufficientStock?: boolean;
  notes?: string;
};

export function procedureKey(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/rta-related\s+/g, '')
    .replace(/\s*\/\s*/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

function parseConsumable(raw: string) {
  const match = raw.trim().match(/^(.*?)\s*\(([\d.]+)\s*(.*?)\)$/);

  if (!match) {
    return {
      name: raw.trim(),
      quantity: 1,
      unit: '',
      raw: raw.trim(),
    };
  }

  return {
    name: match[1].trim(),
    quantity: Number(match[2]) || 1,
    unit: match[3].trim(),
    raw: raw.trim(),
  };
}

export function parseProcedureConsumableSeed() {
  return PROCEDURE_CONSUMABLE_TSV.split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [category, procedure, consumables, totalConsumableLines, directMaterialLines] =
        line.split('\t');

      return {
        category,
        procedure,
        procedureKey: procedureKey(procedure),
        consumables: String(consumables || '')
          .split(';')
          .map(parseConsumable),
        totalConsumableLines: Number(totalConsumableLines || 0),
        directMaterialLines: Number(directMaterialLines || 0),
        isActive: true,
      };
    });
}

export async function ensureProcedureConsumableTemplates() {
  const templates = parseProcedureConsumableSeed();

  await Promise.all(
    templates.map((template) =>
      ProcedureConsumableTemplate.findOneAndUpdate(
        { procedureKey: template.procedureKey },
        { $set: template },
        { new: true, upsert: true, runValidators: true }
      )
    )
  );
}

function normalizeConsumableUnit(unit: string) {
  const normalized = String(unit || '').toLowerCase();
  if (normalized.includes('pair')) return 'pair';
  if (normalized.includes('wipe')) return 'wipes';
  if (normalized.includes('piece')) return 'pieces';
  if (normalized.includes('cartridge')) return 'cartridge';
  if (normalized.includes('pack')) return 'pack';
  if (normalized.includes('bottle')) return 'bottle';
  if (normalized.includes('sleeve')) return 'sleeve';
  if (normalized.includes('strip')) return 'strip';
  if (normalized.includes('dose')) return 'dose';
  if (normalized.includes('each')) return 'each';
  return normalized || 'each';
}

function defaultUsedAmount() {
  return 0;
}

export async function seedInventoryItemsFromProcedureConsumables() {
  await ensureProcedureConsumableTemplates();

  const templates = await ProcedureConsumableTemplate.find({ isActive: true }).lean();
  const itemMap = new Map<string, { name: string; unit: string }>();

  templates.forEach((template: any) => {
    (template.consumables || []).forEach((consumable: any) => {
      const name = String(consumable.name || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          name,
          unit: normalizeConsumableUnit(consumable.unit),
        });
      }
    });
  });

  let created = 0;
  for (const item of itemMap.values()) {
    const existing = await Inventory.findOne({ name: { $regex: `^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (existing) continue;

    await Inventory.create({
      name: item.name,
      category: 'Supplies',
      quantity: 240,
      unit: item.unit,
      reorderLevel: defaultUsedAmount(),
      description: 'Seeded from procedure consumable standards',
    });
    created += 1;
  }

  return { created, totalConsumables: itemMap.size };
}

function mergeUsage(
  current: Map<string, ConsultationConsumableUsage>,
  item: ConsultationConsumableUsage
) {
  const key = `${item.name.toLowerCase()}|${item.unit.toLowerCase()}`;
  const existing = current.get(key);

  if (!existing) {
    current.set(key, item);
    return;
  }

  existing.quantity += item.quantity;
  existing.procedure = [existing.procedure, item.procedure]
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(', ');
}

export async function estimateConsultationConsumables(
  procedures: ConsultationProcedure[] = []
) {
  await ensureProcedureConsumableTemplates();

  const procedureKeys = procedures
    .filter((item) => item.status !== 'cancelled')
    .map((item) => procedureKey(String(item.procedure || '')))
    .filter(Boolean);

  if (procedureKeys.length === 0) return [];

  const templates = await ProcedureConsumableTemplate.find({
    procedureKey: { $in: procedureKeys },
    isActive: true,
  }).lean();

  let allTemplates = templates;
  if (templates.length !== procedureKeys.length) {
    allTemplates = await ProcedureConsumableTemplate.find({ isActive: true }).lean();
  }

  const templateMap = new Map(allTemplates.map((template: any) => [template.procedureKey, template]));
  const usageMap = new Map<string, ConsultationConsumableUsage>();

  const findTemplate = (key: string) => {
    const exact = templateMap.get(key);
    if (exact) return exact;

    return allTemplates.find((template: any) => {
      const templateKey = String(template.procedureKey || '');
      return templateKey.includes(key) || key.includes(templateKey);
    });
  };

  procedures.forEach((procedure) => {
    if (procedure.status === 'cancelled') return;

    const template = findTemplate(procedureKey(String(procedure.procedure || '')));
    if (!template) return;

    template.consumables.forEach((consumable: any) => {
      mergeUsage(usageMap, {
        name: consumable.name,
        quantity: Number(consumable.quantity || 0),
        unit: consumable.unit || '',
        procedure: String(procedure.procedure || template.procedure),
        category: String(procedure.category || template.category),
        source: 'standard',
      });
    });
  });

  const usage = Array.from(usageMap.values());
  const inventory = await Inventory.find({
    name: {
      $in: usage.map((item) => new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')),
    },
  }).lean();
  const inventoryMap = new Map(
    inventory.map((item: any) => [String(item.name || '').toLowerCase(), item])
  );

  return usage.map((item) => {
    const stockItem = inventoryMap.get(item.name.toLowerCase());

    return {
      ...item,
      inventoryItemId: stockItem?._id ? String(stockItem._id) : undefined,
      availableQuantity: stockItem?.quantity,
      hasSufficientStock:
        typeof stockItem?.quantity === 'number'
          ? stockItem.quantity >= item.quantity
          : undefined,
    };
  });
}

function inventoryItemKey(value: string) {
  return String(value || '').trim().toLowerCase();
}

export async function deductConsultationConsumables(consultation: any, user?: any) {
  const consultationId = String(consultation?._id || consultation?.id || '');
  if (!consultationId || consultation.consumablesDeductedAt) {
    return { deducted: false, reason: 'already-deducted-or-missing-consultation' };
  }

  const completedProcedures = (consultation.procedures || []).filter(
    (procedure: any) => procedure.status === 'completed'
  );
  if (completedProcedures.length === 0) {
    return { deducted: false, reason: 'no-completed-procedures' };
  }

  const actualConsumables = (consultation.actualConsumables || []).filter((item: any) => item.name);
  const usage =
    actualConsumables.length > 0
      ? actualConsumables.map((item: any) => ({ ...item, source: 'actual' }))
      : await estimateConsultationConsumables(completedProcedures);

  if (usage.length === 0) {
    return { deducted: false, reason: 'no-usage' };
  }

  const inventory = await Inventory.find({
    name: {
      $in: usage.map(
        (item: any) => new RegExp(`^${String(item.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      ),
    },
  });
  const inventoryMap = new Map(inventory.map((item: any) => [inventoryItemKey(item.name), item]));
  const movements = [];
  const missingItems: string[] = [];

  for (const item of usage) {
    const stockItem: any = inventoryMap.get(inventoryItemKey(item.name));
    if (!stockItem) {
      missingItems.push(item.name);
      continue;
    }

    const quantityChanged = Math.max(Number(item.quantity || 0), 0);
    if (quantityChanged === 0) continue;

    const quantityBefore = Number(stockItem.reorderLevel || 0);
    const quantityAfter = quantityBefore + quantityChanged;
    stockItem.reorderLevel = quantityAfter;
    await stockItem.save();

    movements.push(
      await InventoryMovement.create({
        inventoryItemId: String(stockItem._id),
        itemName: stockItem.name,
        category: stockItem.category,
        unit: stockItem.unit,
        type: actualConsumables.length > 0 ? 'actual-usage' : 'procedure-estimate',
        quantityBefore,
        quantityChanged,
        quantityAfter,
        consultationId,
        procedureName: item.procedure || completedProcedures.map((procedure: any) => procedure.procedure).join(', '),
        source: actualConsumables.length > 0 ? 'actual' : 'estimated',
        createdByUserId: user?.id || '',
        createdByName: user?.name || user?.email || 'System',
        notes: item.notes || '',
      })
    );
  }

  return {
    deducted: movements.length > 0,
    movements,
    missingItems,
  };
}

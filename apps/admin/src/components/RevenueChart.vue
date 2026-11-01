<script setup lang="ts">
import { computed, ref } from 'vue';
import { axisTicks } from '@/app/revenue';
import type { MonthRevenue } from '@/app/revenue';
import { formatCzk, plural } from '@/app/format';

const props = defineProps<{ months: MonthRevenue[] }>();

const MONTH_SHORT = new Intl.DateTimeFormat('cs-CZ', { month: 'short' });
const MONTH_LONG = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' });
/** Axis labels are written in full below this and compact ("20 tis.") from it. */
const COMPACT_FROM = 10_000;

const ticks = computed(() => axisTicks(Math.max(0, ...props.months.map((month) => month.revenue))));
const top = computed(() => ticks.value[ticks.value.length - 1]);
const tickFormat = computed(
  () => new Intl.NumberFormat('cs-CZ', top.value >= COMPACT_FROM ? { notation: 'compact' } : {})
);
const fromBottom = (value: number) => (top.value ? `${(value / top.value) * 100}%` : '0');

const total = computed(() => props.months.reduce((sum, month) => sum + month.revenue, 0));
const newestFirst = computed(() => [...props.months].reverse());

const orderCount = (month: MonthRevenue) =>
  plural(month.orders, 'objednávka', 'objednávky', 'objednávek');
const describe = (month: MonthRevenue) =>
  `${MONTH_LONG.format(month.start)}: ${formatCzk(month.revenue)}, ${orderCount(month)}`;

const view = ref<'chart' | 'table'>('chart');
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="font-semibold">Tržby za {{ months.length }} měsíců</h2>
          <p class="text-sm text-muted">
            Zaplacené objednávky podle měsíce objednání, celkem {{ formatCzk(total) }}
          </p>
        </div>
        <UFieldGroup class="shrink-0" aria-label="Zobrazení tržeb">
          <UButton
            icon="i-lucide-chart-column"
            color="neutral"
            size="sm"
            :variant="view === 'chart' ? 'subtle' : 'outline'"
            :aria-pressed="view === 'chart'"
            aria-label="Graf"
            @click="view = 'chart'"
          />
          <UButton
            icon="i-lucide-table-2"
            color="neutral"
            size="sm"
            :variant="view === 'table' ? 'subtle' : 'outline'"
            :aria-pressed="view === 'table'"
            aria-label="Tabulka"
            @click="view = 'table'"
          />
        </UFieldGroup>
      </div>
    </template>

    <div
      v-if="view === 'chart'"
      class="flex gap-2 pt-2"
      role="group"
      aria-label="Tržby po měsících"
    >
      <!-- The axis: one label per gridline, centred on it. -->
      <div class="relative h-40 w-12 shrink-0 text-right text-xs text-muted tabular-nums">
        <span
          v-for="tick in ticks"
          :key="tick"
          class="absolute right-0 translate-y-1/2"
          :style="{ bottom: fromBottom(tick) }"
        >
          {{ tickFormat.format(tick) }}
        </span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="relative h-40">
          <div
            v-for="tick in ticks"
            :key="tick"
            class="absolute inset-x-0 border-t border-default"
            :style="{ bottom: fromBottom(tick) }"
          />
          <div class="absolute inset-0 flex">
            <!-- The whole column answers the pointer and the keyboard, not just the bar. -->
            <UTooltip
              v-for="month in months"
              :key="month.start.getTime()"
              :delay-duration="0"
              :content="{ side: 'top' }"
            >
              <div
                role="img"
                tabindex="0"
                :aria-label="describe(month)"
                class="group flex h-full flex-1 items-end justify-center rounded-sm outline-none hover:bg-elevated/60 focus-visible:bg-elevated"
              >
                <div
                  class="w-3/5 max-w-6 rounded-t-[4px] bg-(--ui-color-primary-500) transition group-hover:bg-(--ui-color-primary-400) group-focus-visible:bg-(--ui-color-primary-400)"
                  :style="{
                    height: fromBottom(month.revenue),
                    minHeight: month.revenue > 0 ? '2px' : 0,
                  }"
                />
              </div>
              <template #content>
                <div class="py-0.5">
                  <p class="font-semibold text-highlighted">{{ formatCzk(month.revenue) }}</p>
                  <p class="text-muted">
                    {{ MONTH_LONG.format(month.start) }} · {{ orderCount(month) }}
                  </p>
                </div>
              </template>
            </UTooltip>
          </div>
        </div>
        <!-- Each label centred under its column; where the columns are too narrow for every label,
             every other one shows, the current month's always. -->
        <div class="mt-1 flex text-xs text-muted @container" aria-hidden="true">
          <span
            v-for="(month, index) in months"
            :key="month.start.getTime()"
            class="flex min-w-0 flex-1 justify-center whitespace-nowrap"
            :class="{ '@max-[15rem]:invisible': (months.length - 1 - index) % 2 === 1 }"
          >
            {{ MONTH_SHORT.format(month.start) }}
          </span>
        </div>
      </div>
    </div>

    <table v-else class="w-full text-sm">
      <thead class="text-left text-muted">
        <tr class="border-b border-default">
          <th class="py-2 font-medium">Měsíc</th>
          <th class="py-2 text-right font-medium">Objednávky</th>
          <th class="py-2 text-right font-medium">Tržba</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-default">
        <tr v-for="month in newestFirst" :key="month.start.getTime()">
          <td class="py-2 first-letter:uppercase">{{ MONTH_LONG.format(month.start) }}</td>
          <td class="py-2 text-right tabular-nums">{{ month.orders }}</td>
          <td class="py-2 text-right tabular-nums">{{ formatCzk(month.revenue) }}</td>
        </tr>
      </tbody>
    </table>
  </UCard>
</template>

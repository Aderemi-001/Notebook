import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Helper to extract item config from a payload
function get  (payload: any, options: { dataKey?: string; nameKey?: string; labelKey?: string }) {
  if (payload.length === 0) {
    return null;
  }

  const item = payload[0];
  const name = item.name || item.dataKey || "";
  const value = item.value;
  const color = item.color;

  return {
    name,
    value,
    color,
  };
}

type ChartContextProps = {
  config: Record<string, any>;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <Chart />");
  }

  return context;
}

type ChartProps = {
  id?: string;
  className?: string;
  children?: React.ReactNode;
  config: Record<string, any>;
} & React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>;

const Chart = React.forwardRef<HTMLDivElement, ChartProps>(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId}`;
    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn("flex h-full w-full flex-col", className)}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer {...props}>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    );
  }
);
Chart.displayName = "Chart";

function ChartStyle({ id, config }: { id: string; config: Record<string, any> }) {
  const colorConfig = Object.entries(config).filter(
    ([_, item]) => item.color
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          ${colorConfig
            .map(
              ([key, _]) => `
            .recharts-surface--${id} .recharts-dot.${key}-dot,
            .recharts-surface--${id} .recharts-legend-item.${key}-item,
            .recharts-surface--${id} .recharts-bar.${key}-bar,
            .recharts-surface--${id} .recharts-line.${key}-line,
            .recharts-surface--${id} .recharts-area-top.${key}-area,
            .recharts-surface--${id} .recharts-tooltip-cursor.${key}-cursor {
              fill: var(--color-${key}) !important;
              stroke: var(--color-${key}) !important;
            }
          `
            )
            .join("")}
        `,
      }}
    />
  );
}

type ChartTooltipProps = React.ComponentProps<typeof RechartsPrimitive.Tooltip> & {
  className?: string;
  indicator?: "dot" | "line";
  hideIndicator?: boolean;
  labelFormatter?: (value: string | number, payload: any[]) => React.ReactNode;
  formatter?: (value: string | number, name: string, item: any, index: number) => React.ReactNode;
  color?: string;
  nameKey?: string;
  labelKey?: string;
};

const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  ChartTooltipProps
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart();
    const tooltipLabel = React.useMemo(() => {
      if (labelFormatter) {
        return labelFormatter(label as string | number, payload as any[]);
      }

      if (labelKey) {
        return get(payload, { dataKey: labelKey })?.name;
      }

      return label;
    }, [label, labelFormatter, payload, labelKey]);

    if (active && payload && payload.length) {
      return (
        <div
          ref={ref}
          className={cn(
            "grid min-w-[8rem] items-start gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs shadow-xl",
            className
          )}
        >
          {tooltipLabel ? (
            <div className={cn("font-medium", labelClassName)}>
              {tooltipLabel}
            </div>
          ) : null}
          <div className="grid gap-1.5">
            {payload.map((item: any, index: number) => {
              const key = `${nameKey || item.name || item.dataKey || "value"}`;
              const itemConfig = config[key];
              const itemColor = itemConfig?.color || item.color || color;

              if (!item.value && itemConfig?.hide) {
                return null;
              }

              return (
                <div
                  key={item.dataKey}
                  className="flex w-full items-center gap-2"
                >
                  {!hideIndicator && (
                    <div
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-[2px]",
                        indicator === "dot" && "rounded-full",
                        indicator === "line" && "h-0.5 w-3.5 rounded-full",
                        itemColor && `bg-[--color-${key}]`
                      )}
                      style={
                        {
                          "--color-bg": `var(--color-${key})`,
                          backgroundColor: itemColor,
                        } as React.CSSProperties
                      }
                    />
                  )}
                  {formatter ? (
                    formatter(item.value, item.name, item, index)
                  ) : (
                    <div className="flex flex-1 justify-between leading-none">
                      <div className="grid gap-1.5">
                        {itemConfig?.label || item.name}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  }
);
ChartTooltip.displayName = "ChartTooltip";

type ChartLegendProps = React.ComponentProps<typeof RechartsPrimitive.Legend> & {
  className?: string;
  hideIcon?: boolean;
  formatter?: (value: string, entry: any, index: number) => React.ReactNode;
  nameKey?: string; // Added nameKey
};

const ChartLegend = React.forwardRef<
  HTMLDivElement,
  ChartLegendProps
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey, ...props }, // Destructured nameKey
    ref
  ) => {
    const { config } = useChart();

    if (!payload || !payload.length) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-8" : "pt-8",
          className
        )}
        {...props}
      >
        {payload.map((item: any) => {
          const key = `${nameKey || item.dataKey || "value"}`;
          const itemConfig = config[key];

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5",
                itemConfig?.hide && "opacity-50"
              )}
            >
              {!hideIcon && (
                <div
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-[2px]",
                    itemConfig?.color && `bg-[--color-${key}]`
                  )}
                  style={
                    {
                      "--color-bg": `var(--color-${key})`,
                      backgroundColor: itemConfig?.color,
                    } as React.CSSProperties
                  }
                />
              )}
              {itemConfig?.label}
            </div>
          );
        })}
      </div>
    );
  }
);
ChartLegend.displayName = "ChartLegend";

export { Chart, ChartTooltip, ChartLegend };
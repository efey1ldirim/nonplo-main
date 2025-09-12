import { cn } from "@/lib/utils";
import { memo, useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc,
  Grid,
  List,
  MoreHorizontal,
  Star,
  Clock,
  TrendingUp,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Enhanced dashboard card with hover effects and actions
interface DashboardCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  }>;
  onClick?: () => void;
  className?: string;
}

export const DashboardCard = memo(({
  title,
  subtitle,
  value,
  trend,
  icon,
  actions,
  onClick,
  className
}: DashboardCardProps) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <Card 
      className={cn(
        "relative transition-all duration-200 hover:shadow-md cursor-pointer group",
        onClick && "hover:scale-105",
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 bg-primary/10 rounded-lg">
              {icon}
            </div>
          )}
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        {actions && showActions && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {actions.slice(0, 2).map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className="h-8 w-8 p-0"
              >
                {action.icon}
              </Button>
            ))}
            
            {actions.length > 2 && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {value}
            </div>
            
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-sm",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                <TrendingUp className={cn(
                  "h-3 w-3",
                  !trend.isPositive && "rotate-180"
                )} />
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Data table with enhanced features
interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    render?: (value: any, item: T) => React.ReactNode;
    sortable?: boolean;
  }>;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  viewMode?: "table" | "grid";
  onItemClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  filterable = false,
  pagination = true,
  viewMode: initialViewMode = "table",
  onItemClick,
  className
}: DataTableProps<T>) {
  const [viewMode, setViewMode] = useState<"table" | "grid">(initialViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof T;
    direction: "asc" | "desc";
  } | null>(null);

  // Filter and sort data
  const processedData = data
    .filter(item => {
      if (!searchQuery) return true;
      return Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (key: keyof T) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          )}
          
          {filterable && (
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrele
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-3"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Data display */}
      {viewMode === "table" ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                      column.sortable && "cursor-pointer hover:text-foreground"
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && sortConfig?.key === column.key && (
                        sortConfig.direction === "asc" ? (
                          <SortAsc className="h-3 w-3" />
                        ) : (
                          <SortDesc className="h-3 w-3" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedData.map((item, index) => (
                <tr
                  key={index}
                  className={cn(
                    "border-t hover:bg-muted/50 transition-colors",
                    onItemClick && "cursor-pointer"
                  )}
                  onClick={() => onItemClick?.(item)}
                >
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-4 py-3 text-sm">
                      {column.render 
                        ? column.render(item[column.key], item)
                        : String(item[column.key] || "-")
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedData.map((item, index) => (
            <Card 
              key={index}
              className={cn(
                "cursor-pointer hover:shadow-md transition-all duration-200",
                onItemClick && "hover:scale-105"
              )}
              onClick={() => onItemClick?.(item)}
            >
              <CardContent className="p-4">
                {columns.slice(0, 3).map((column) => (
                  <div key={String(column.key)} className="mb-2 last:mb-0">
                    <span className="text-xs text-muted-foreground">
                      {column.label}:
                    </span>
                    <div className="text-sm font-medium">
                      {column.render 
                        ? column.render(item[column.key], item)
                        : String(item[column.key] || "-")
                      }
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        {processedData.length} sonuç gösteriliyor
        {searchQuery && ` "${searchQuery}" için`}
      </div>
    </div>
  );
}

// Quick action menu
interface QuickActionMenuProps {
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "destructive";
  }>;
  trigger?: React.ReactNode;
  className?: string;
}

export const QuickActionMenu = memo(({
  actions,
  trigger,
  className
}: QuickActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 w-8 p-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )}

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-20 bg-popover border rounded-md shadow-lg py-1 min-w-32">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2",
                  action.variant === "destructive" && "text-destructive hover:bg-destructive/10"
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});

DashboardCard.displayName = "DashboardCard";
QuickActionMenu.displayName = "QuickActionMenu";
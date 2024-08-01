import { useContext } from "react";
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell as AriaCalendarCell,
  CalendarGrid as AriaCalendarGrid,
  CalendarGridBody as AriaCalendarGridBody,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarHeaderCell as AriaCalendarHeaderCell,
  Heading as AriaHeading,
  RangeCalendar as AriaRangeCalendar,
  RangeCalendarStateContext as AriaRangeCalendarStateContext,
  Text as AriaText,
  composeRenderProps,
  useLocale,
} from "react-aria-components";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  calendarCellStyles,
  calendarGridStyles,
  calendarHeaderCellStyles,
  calendarHeadingButtonStyles,
  calendarStyles,
} from "~/styles/components/primitives/calendar";

import type { HTMLAttributes } from "react";
import type {
  CalendarCellProps as AriaCalendarCellProps,
  CalendarGridBodyProps as AriaCalendarGridBodyProps,
  CalendarGridHeaderProps as AriaCalendarGridHeaderProps,
  CalendarGridProps as AriaCalendarGridProps,
  CalendarHeaderCellProps as AriaCalendarHeaderCellProps,
  CalendarProps as AriaCalendarProps,
  DateValue as AriaDateValue,
  RangeCalendarProps as AriaRangeCalendarProps,
} from "react-aria-components";

export const BaseCalendar = AriaCalendar;

export const BaseRangeCalendar = AriaRangeCalendar;

export type CalendarHeadingProps = HTMLAttributes<HTMLElement>;
export const CalendarHeading = (props: CalendarHeadingProps) => {
  const { direction } = useLocale();

  return (
    <header className="flex w-full items-center gap-1 px-1 pb-4" {...props}>
      <AriaButton
        slot="previous"
        className={composeRenderProps("", (_className, renderProps) =>
          calendarHeadingButtonStyles({ variant: "outline", ...renderProps }),
        )}
      >
        {direction === "rtl" ? (
          <ChevronRight aria-hidden className="size-4" />
        ) : (
          <ChevronLeft aria-hidden className="size-4" />
        )}
      </AriaButton>

      <AriaHeading className="grow text-center text-sm font-medium" />

      <AriaButton
        slot="next"
        className={composeRenderProps("", (_className, renderProps) =>
          calendarHeadingButtonStyles({ variant: "outline", ...renderProps }),
        )}
      >
        {direction === "rtl" ? (
          <ChevronLeft aria-hidden className="size-4" />
        ) : (
          <ChevronRight aria-hidden className="size-4" />
        )}
      </AriaButton>
    </header>
  );
};

export type CalendarGridProps = AriaCalendarGridProps;
export const CalendarGrid = ({ className, ...props }: CalendarGridProps) => (
  <AriaCalendarGrid className={calendarGridStyles({ className })} {...props} />
);

export type CalendarGridHeaderProps = AriaCalendarGridHeaderProps;
export const CalendarGridHeader = ({ ...props }: CalendarGridHeaderProps) => (
  <AriaCalendarGridHeader {...props} />
);

export type CalendarHeaderCellProps = AriaCalendarHeaderCellProps;
export const CalendarHeaderCell = ({
  className,
  ...props
}: CalendarHeaderCellProps) => (
  <AriaCalendarHeaderCell
    className={calendarHeaderCellStyles({ className })}
    {...props}
  />
);

export type CalendarGridBodyProps = AriaCalendarGridBodyProps;
export const CalendarGridBody = ({
  className,
  ...props
}: CalendarGridBodyProps) => (
  <AriaCalendarGridBody
    className={calendarGridStyles({ className })}
    {...props}
  />
);

export type CalendarCellProps = AriaCalendarCellProps;
export function CalendarCell({ className, ...props }: CalendarCellProps) {
  const isRange = Boolean(useContext(AriaRangeCalendarStateContext));

  return (
    <AriaCalendarCell
      className={composeRenderProps(className, (className, renderProps) =>
        calendarCellStyles({
          className,
          ...renderProps,
          isHovered:
            renderProps.isHovered &&
            renderProps.isSelected &&
            (renderProps.isSelectionStart ||
              renderProps.isSelectionEnd ||
              !isRange),
          isCurrentDate:
            renderProps.date.compare(today(getLocalTimeZone())) === 0,
          isRange,
        }),
      )}
      {...props}
    />
  );
}

export interface CalendarProps<T extends AriaDateValue>
  extends AriaCalendarProps<T> {
  errorMessage?: string;
}
export function Calendar<T extends AriaDateValue>({
  errorMessage,
  className,
  ...props
}: CalendarProps<T>) {
  return (
    <BaseCalendar
      className={composeRenderProps(className, (className) =>
        calendarStyles({ className }),
      )}
      {...props}
    >
      <CalendarHeading />

      <CalendarGrid>
        <CalendarGridHeader>
          {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
        </CalendarGridHeader>

        <CalendarGridBody>
          {(date) => <CalendarCell date={date} />}
        </CalendarGridBody>
      </CalendarGrid>

      {errorMessage && (
        <AriaText className="text-destructive text-sm" slot="errorMessage">
          {errorMessage}
        </AriaText>
      )}
    </BaseCalendar>
  );
}

export interface RangeCalendarProps<T extends AriaDateValue>
  extends AriaRangeCalendarProps<T> {
  errorMessage?: string;
}
export const RangeCalendar = <T extends AriaDateValue>({
  errorMessage,
  className,
  ...props
}: RangeCalendarProps<T>) => (
  <BaseRangeCalendar
    className={composeRenderProps(className, (className) =>
      calendarStyles({ className }),
    )}
    {...props}
  >
    <CalendarHeading />

    <CalendarGrid>
      <CalendarGridHeader>
        {(day) => <CalendarHeaderCell>{day}</CalendarHeaderCell>}
      </CalendarGridHeader>

      <CalendarGridBody>
        {(date) => <CalendarCell date={date} />}
      </CalendarGridBody>
    </CalendarGrid>

    {errorMessage && (
      <AriaText slot="errorMessage" className="text-destructive text-sm">
        {errorMessage}
      </AriaText>
    )}
  </BaseRangeCalendar>
);

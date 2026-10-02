import SwiftUI
import WidgetKit

struct MediumWidgetView: View {
    let payload: WidgetPayload

    var body: some View {
        HStack(spacing: 16) {
            // Left Column: Flow Engine Card
            leftColumn
                .frame(width: 135)

            // Subtle vertical divider
            Rectangle()
                .fill(Color(white: 0.15))
                .frame(width: 1)
                .padding(.vertical, 4)

            // Right Column: Top Metrics
            rightColumn
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(14)
        .background(Color(red: 0.055, green: 0.059, blue: 0.071)) // #0e0f12
    }

    @ViewBuilder
    private var leftColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let flow = payload.flow, flow.isActive {
                // Active Flow Session
                HStack(spacing: 5) {
                    Circle()
                        .fill(flow.isPaused ? Color.yellow : Color(red: 0.23, green: 0.51, blue: 0.96))
                        .frame(width: 6, height: 6)
                    Text(flow.isPaused ? "PAUSED" : "FLOW")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(0.6)
                        .foregroundColor(Color(red: 0.75, green: 0.86, blue: 1.0))
                    Spacer()
                }

                Text(flow.title.isEmpty ? "Flow Session" : flow.title)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .padding(.top, 4)

                Spacer()

                Text(flow.timeFormatted)
                    .font(.system(size: 26, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.8)
                    .lineLimit(1)

                Spacer()

                HStack(spacing: 6) {
                    HStack(spacing: 3) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 8))
                        Text("\(flow.flowScore)%")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(Color(red: 0.14, green: 0.24, blue: 0.42).opacity(0.7))
                    .foregroundColor(Color(red: 0.58, green: 0.77, blue: 0.99))
                    .cornerRadius(4)

                    Text("\(flow.contextSwitches) sw")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(white: 0.6))
                }
            } else {
                // Idle Flow State
                HStack(spacing: 5) {
                    Circle()
                        .fill(Color(white: 0.35))
                        .frame(width: 6, height: 6)
                    Text("FLOW")
                        .font(.system(size: 10, weight: .bold))
                        .tracking(0.6)
                        .foregroundColor(Color(white: 0.5))
                    Spacer()
                }

                Text("Deep Work")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.top, 4)

                Spacer()

                if let summary = payload.summary {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(summary.activeHoursFormatted)
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        Text("\(summary.deepWorkPercent)% in deep craft")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(Color(red: 0.58, green: 0.77, blue: 0.99))
                    }
                } else {
                    Text("Ready to flow")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color(white: 0.6))
                }

                Spacer()

                Text("Enter Flow in MeTric")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(white: 0.4))
            }
        }
    }

    @ViewBuilder
    private var rightColumn: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("TODAY'S TARGETS")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(0.8)
                    .foregroundColor(Color(white: 0.45))
                Spacer()
                Text(payload.dateFormatted)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(white: 0.4))
            }

            let displayMetrics = Array(payload.metrics.prefix(3))
            if displayMetrics.isEmpty {
                Spacer()
                Text("No metrics configured for today")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color(white: 0.5))
                Spacer()
            } else {
                VStack(spacing: 8) {
                    ForEach(displayMetrics) { item in
                        metricRow(item: item)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func metricRow(item: MetricPayload) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text(item.name)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(white: 0.8))
                    .lineLimit(1)
                Spacer()
                HStack(spacing: 2) {
                    Text(item.valueFormatted)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white)
                    if let target = item.targetFormatted {
                        Text("/ \(target)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(Color(white: 0.45))
                    }
                }
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color(white: 0.15))
                        .frame(height: 3)
                    Capsule()
                        .fill(item.isCompleted ? Color.green : Color.white)
                        .frame(width: max(3, min(geo.size.width, geo.size.width * CGFloat(min(1.0, item.percent / 100.0)))), height: 3)
                }
            }
            .frame(height: 3)
        }
    }
}

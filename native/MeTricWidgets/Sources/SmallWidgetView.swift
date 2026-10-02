import SwiftUI
import WidgetKit

struct SmallWidgetView: View {
    let payload: WidgetPayload

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let flow = payload.flow, flow.isActive {
                // Active Flow State
                activeFlowContent(flow: flow)
            } else {
                // Today Metrics State
                idleMetricsContent
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(14)
        .background(Color(red: 0.055, green: 0.059, blue: 0.071)) // #0e0f12
    }

    @ViewBuilder
    private func activeFlowContent(flow: FlowPayload) -> some View {
        HStack(spacing: 5) {
            Circle()
                .fill(flow.isPaused ? Color.yellow : Color(red: 0.23, green: 0.51, blue: 0.96))
                .frame(width: 6, height: 6)
            Text(flow.isPaused ? "PAUSED" : "FLOW")
                .font(.system(size: 10, weight: .bold, design: .default))
                .tracking(0.5)
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
            .font(.system(size: 32, weight: .bold, design: .monospaced))
            .foregroundColor(.white)
            .minimumScaleFactor(0.8)
            .lineLimit(1)

        Spacer()

        HStack(spacing: 6) {
            HStack(spacing: 3) {
                Image(systemName: "sparkles")
                    .font(.system(size: 9))
                Text("\(flow.flowScore)%")
                    .font(.system(size: 10, weight: .semibold))
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color(red: 0.14, green: 0.24, blue: 0.42).opacity(0.6))
            .foregroundColor(Color(red: 0.58, green: 0.77, blue: 0.99))
            .cornerRadius(4)

            Text("\(flow.contextSwitches) sw")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(white: 0.6))
        }
    }

    @ViewBuilder
    private var idleMetricsContent: some View {
        HStack {
            Text("TODAY")
                .font(.system(size: 10, weight: .bold))
                .tracking(0.8)
                .foregroundColor(Color(white: 0.5))
            Spacer()
            Text(payload.dateFormatted)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(white: 0.4))
        }

        Spacer()

        if let first = payload.metrics.first {
            VStack(alignment: .leading, spacing: 3) {
                Text(first.name)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(white: 0.7))
                    .lineLimit(1)

                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text(first.valueFormatted)
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    if let target = first.targetFormatted {
                        Text("/ \(target)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(Color(white: 0.5))
                    }
                }

                // Progress Bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color(white: 0.15))
                            .frame(height: 4)
                        Capsule()
                            .fill(first.isCompleted ? Color.green : Color.white)
                            .frame(width: max(4, min(geo.size.width, geo.size.width * CGFloat(min(1.0, first.percent / 100.0)))), height: 4)
                    }
                }
                .frame(height: 4)
                .padding(.top, 4)
            }
        } else {
            Text("Ready to Track")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(white: 0.6))
        }

        Spacer()

        if payload.metrics.count > 1 {
            let next = payload.metrics[1]
            HStack {
                Text(next.name)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(white: 0.5))
                    .lineLimit(1)
                Spacer()
                Text(next.valueFormatted)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white)
            }
            .padding(.top, 2)
        } else {
            HStack(spacing: 4) {
                Circle().fill(Color.green).frame(width: 5, height: 5)
                Text("MeTric")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(white: 0.5))
            }
        }
    }
}

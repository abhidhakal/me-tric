import Foundation

struct WidgetPayload: Codable {
    let updatedAt: String
    let dateFormatted: String
    let flow: FlowPayload?
    let metrics: [MetricPayload]
    let summary: SummaryPayload?
    
    static var placeholder: WidgetPayload {
        WidgetPayload(
            updatedAt: "",
            dateFormatted: "Today",
            flow: FlowPayload(
                isActive: false,
                isPaused: false,
                title: "Ready to Flow",
                elapsedSeconds: 0,
                targetMinutes: 45,
                flowScore: 100,
                contextSwitches: 0
            ),
            metrics: [
                MetricPayload(id: "1", name: "Deep Work", valueFormatted: "3.5h", targetFormatted: "4h", percent: 88, isCompleted: false),
                MetricPayload(id: "2", name: "Reading", valueFormatted: "30m", targetFormatted: "30m", percent: 100, isCompleted: true),
                MetricPayload(id: "3", name: "Workout", valueFormatted: "1", targetFormatted: "1", percent: 100, isCompleted: true)
            ],
            summary: SummaryPayload(
                activeHoursFormatted: "4.2h",
                deepWorkPercent: 78,
                completedGoalsCount: 3
            )
        )
    }
}

struct FlowPayload: Codable {
    let isActive: Bool
    let isPaused: Bool
    let title: String
    let elapsedSeconds: Int
    let targetMinutes: Int
    let flowScore: Int
    let contextSwitches: Int
    
    var timeFormatted: String {
        let totalSecs: Int
        if targetMinutes > 0 {
            totalSecs = max(0, targetMinutes * 60 - elapsedSeconds)
        } else {
            totalSecs = elapsedSeconds
        }
        let m = totalSecs / 60
        let s = totalSecs % 60
        return String(format: "%02d:%02d", m, s)
    }
}

struct MetricPayload: Codable, Identifiable {
    let id: String
    let name: String
    let valueFormatted: String
    let targetFormatted: String?
    let percent: Double
    let isCompleted: Bool
}

struct SummaryPayload: Codable {
    let activeHoursFormatted: String
    let deepWorkPercent: Int
    let completedGoalsCount: Int
}

enum WidgetDataLoader {
    static func load() -> WidgetPayload {
        let fileManager = FileManager.default
        guard let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return .placeholder
        }
        let dataUrl = appSupport.appendingPathComponent("MeTric/widget-data.json")
        guard let data = try? Data(contentsOf: dataUrl) else {
            return .placeholder
        }
        let decoder = JSONDecoder()
        do {
            return try decoder.decode(WidgetPayload.self, from: data)
        } catch {
            return .placeholder
        }
    }
}

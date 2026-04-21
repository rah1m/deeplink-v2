import Foundation
import UIKit

/// Minimal Universal Link handler for the deeplink platform.
///
/// Wire-up in SceneDelegate:
///
///     func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
///         DeeplinkHandler.shared.handle(userActivity: userActivity)
///     }
///
/// And in SceneDelegate.scene(_:willConnectTo:options:):
///
///     DeeplinkHandler.shared.reportInstallIfFirstLaunch()
///
public final class DeeplinkHandler {
    public static let shared = DeeplinkHandler()

    /// HTTPS origin of your deeplink platform (same domain as your AASA file).
    public var baseURL = URL(string: "https://links.nar.az")!

    private let installedKey = "dl_install_reported"

    public func handle(userActivity: NSUserActivity) {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL else { return }
        handle(url: url)
    }

    public func handle(url: URL) {
        let cid = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?.first(where: { $0.name == "cid" })?.value
        let slug = extractSlug(from: url)

        reportEvent(kind: "open", cid: cid, slug: slug)
        route(to: url)
    }

    /// Read cid from the clipboard once on first launch. The web redirect copies
    /// it there as a best-effort fallback when the app isn't installed yet.
    public func reportInstallIfFirstLaunch() {
        let defaults = UserDefaults.standard
        guard !defaults.bool(forKey: installedKey) else { return }
        defaults.set(true, forKey: installedKey)

        let clipboard = UIPasteboard.general.string ?? ""
        let cid = parseCid(from: clipboard)
        reportEvent(kind: "install", cid: cid, slug: nil)
    }

    private func reportEvent(kind: String, cid: String?, slug: String?) {
        var payload: [String: Any] = ["kind": kind, "platform": "ios"]
        if let cid { payload["cid"] = cid }
        if let slug { payload["slug"] = slug }

        var req = URLRequest(url: baseURL.appendingPathComponent("/api/events"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        URLSession.shared.dataTask(with: req).resume()
    }

    private func extractSlug(from url: URL) -> String? {
        let parts = url.pathComponents
        guard let i = parts.firstIndex(of: "l"), i + 1 < parts.count else { return nil }
        return parts[i + 1]
    }

    private func parseCid(from text: String) -> String? {
        // Clipboard format written by the web page: "dl_cid=<id>"
        guard let range = text.range(of: "dl_cid=") else { return nil }
        let tail = text[range.upperBound...]
        let cid = tail.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).first
        return cid.map(String.init)
    }

    private func route(to url: URL) {
        // TODO: map URL paths into your app's router / navigation stack.
        // Example: /promo/spring -> PromoViewController(slug: "spring")
        NotificationCenter.default.post(
            name: .deeplinkReceived, object: nil, userInfo: ["url": url]
        )
    }
}

public extension Notification.Name {
    static let deeplinkReceived = Notification.Name("DeeplinkReceived")
}

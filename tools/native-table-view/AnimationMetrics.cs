using System.Text.Json;
using Windows.UI.Core.AnimationMetrics;

namespace WinUI.TableView.SampleApp;

internal static partial class ParityCapture
{
    // Query the same OS animation descriptions used by native theme transitions.
    // These are timing inputs, not a substitute for observing presented frames.
    static void SaveAnimationMetrics()
    {
        var result = new Dictionary<string, object>();
        var entrance = new Microsoft.UI.Xaml.Media.Animation.EntranceThemeTransition();
        result["EntranceThemeTransition-defaults"] = new { entrance.FromHorizontalOffset, entrance.FromVerticalOffset, entrance.IsStaggeringEnabled };
        foreach (var effect in Enum.GetValues<AnimationEffect>().Where(e => e.ToString().Contains("List") || e.ToString().Contains("Fade") || e.ToString().Contains("Drag") || e.ToString().Contains("Enter") || e == AnimationEffect.Reposition))
        foreach (var target in Enum.GetValues<AnimationEffectTarget>())
        {
            try
            {
                var description = new AnimationDescription(effect, target);
                result[$"{effect}-{target}"] = description.Animations.Select(a => new {
                    durationMs = a.Duration.TotalMilliseconds, delayMs = a.Delay.TotalMilliseconds,
                    curve = new[] { a.Control1.X, a.Control1.Y, a.Control2.X, a.Control2.Y },
                    type = a.Type.ToString(),
                    values = a.GetType().GetProperties().Where(p => p.Name.StartsWith("Initial") || p.Name.StartsWith("Final") || p.Name == "NormalizedOrigin").ToDictionary(p => p.Name, p => p.GetValue(a))
                }).ToArray();
            }
            catch (Exception error) { result[$"{effect}-{target}"] = new { unsupported = error.GetType().Name }; }
        }
        File.WriteAllText(Path.Combine(Output, "animation-metrics.json"), JsonSerializer.Serialize(result, Json));
    }
}

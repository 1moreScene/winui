using System.Text.Json;
using Windows.UI.ViewManagement;

var settings = new UISettings();
var accent = settings.GetColorValue(UIColorType.Accent);
var record = new {
    recordedAtUtc = DateTimeOffset.UtcNow,
    source = "Windows.UI.ViewManagement.UISettings.GetColorValue(UIColorType.Accent)",
    accent = $"#{accent.R:X2}{accent.G:X2}{accent.B:X2}",
};
File.WriteAllText(args[0], JsonSerializer.Serialize(record, new JsonSerializerOptions { WriteIndented = true }) + "\n");

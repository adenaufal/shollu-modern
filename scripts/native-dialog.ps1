param([Parameter(Mandatory=$true)][int]$AppProcessId, [string]$SavePath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class SholluDialogControl {
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr hwnd, uint message, IntPtr wparam, string text);
}
'@
$processFilter = [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $AppProcessId)
$deadline = [DateTime]::UtcNow.AddSeconds(15)
do {
    $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, $processFilter)
    foreach ($window in $windows) {
        $buttons = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
        $cancel = $null
        $save = $null
        foreach ($button in $buttons) {
            if ($button.Current.Name.Replace('&','') -match '^(Cancel|Batal)$') { $cancel = $button }
            if ($button.Current.Name.Replace('&','') -match '^(Save|Simpan)$') { $save = $button }
        }
        if ($cancel) {
            if ($SavePath) {
                $filenameHost = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::AutomationIdProperty, 'FileNameControlHost'))
                if (!$filenameHost) { continue }
                $filename = $filenameHost.FindFirst([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::AutomationIdProperty, '1001'))
                if (!$filename -or !$save) { continue }
                [void][SholluDialogControl]::SendMessage([IntPtr]$filename.Current.NativeWindowHandle, 0x000C, [IntPtr]::Zero, $SavePath)
                [void][SholluDialogControl]::SendMessage([IntPtr]$save.Current.NativeWindowHandle, 0x00F5, [IntPtr]::Zero, $null)
            } else {
                [void][SholluDialogControl]::SendMessage([IntPtr]$cancel.Current.NativeWindowHandle, 0x00F5, [IntPtr]::Zero, $null)
            }
            exit 0
        }
    }
    Start-Sleep -Milliseconds 150
} while ([DateTime]::UtcNow -lt $deadline)
throw "No supported native file dialog found for app process $AppProcessId"

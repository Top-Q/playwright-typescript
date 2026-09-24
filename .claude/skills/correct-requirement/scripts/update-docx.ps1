<#
.SYNOPSIS
    Replaces one exact paragraph of text inside a .docx.

.DESCRIPTION
    A .docx is a zip archive; its text lives in word/document.xml. This rewrites
    that one entry in place and leaves every other part of the archive — styles,
    numbering, images — untouched.

    It refuses, changing nothing, unless -Old occurs exactly once: a text that
    appears twice would be ambiguous, and a text that appears nowhere means the
    document says something other than what you think it does. Word can split a
    sentence across several runs of XML; if -Old is not found although you can
    see it in Word, that is why — shorten -Old to a run-sized fragment.

.EXAMPLE
    ./update-docx.ps1 -Path specs/product/openproject-demo-requirements.docx `
        -Old 'BR-WP-04: Deleting a Work Package is a soft operation…' `
        -New 'BR-WP-04: Deleting a Work Package is permanent…'
#>
param(
    [Parameter(Mandatory)] [string] $Path,
    [Parameter(Mandatory)] [string] $Old,
    [Parameter(Mandatory)] [string] $New
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

# XML-escape the way Word writes text, so the search matches the stored form.
function ConvertTo-XmlText([string] $text) {
    return $text.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;')
}

$file = (Resolve-Path -LiteralPath $Path).Path
$oldXml = ConvertTo-XmlText $Old
$newXml = ConvertTo-XmlText $New

$zip = [IO.Compression.ZipFile]::Open($file, 'Update')
try {
    $entry = $zip.GetEntry('word/document.xml')
    if (-not $entry) { throw "$Path has no word/document.xml; is it a .docx?" }
    $reader = New-Object IO.StreamReader($entry.Open())
    $xml = $reader.ReadToEnd()
    $reader.Close()

    $count = ([regex]::Matches($xml, [regex]::Escape($oldXml))).Count
    if ($count -ne 1) {
        throw "-Old occurs $count time(s) in $Path; it must occur exactly once. Nothing was changed."
    }

    $xml = $xml.Replace($oldXml, $newXml)
    $entry.Delete()
    $writer = New-Object IO.StreamWriter(
        $zip.CreateEntry('word/document.xml').Open(),
        (New-Object Text.UTF8Encoding $false))
    $writer.Write($xml)
    $writer.Close()
}
finally {
    $zip.Dispose()
}

Write-Output "update-docx: replaced 1 occurrence in $Path"

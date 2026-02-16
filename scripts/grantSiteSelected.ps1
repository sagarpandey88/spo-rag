param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [Parameter(Mandatory = $true)]
    [string]$AppId,             # Azure AD App (client) ID

    [Parameter(Mandatory = $true)]
    [ValidateSet("Read","Write","FullControl")]
    [string]$Permissions,       # Sites.Selected role

    [Parameter(Mandatory = $false)]
    [string]$DisplayName = "SitesSelected App"
)

# Connect as admin (or app with Sites.FullControl.All on SharePoint)
Write-Host "Connecting to $SiteUrl..."
Connect-PnPOnline -Url $SiteUrl -Interactive

# Check if permission already exists
$existing = Get-PnPAzureADAppSitePermission -Site $SiteUrl -AppIdentity $AppId -ErrorAction SilentlyContinue

if ($existing) {
    Write-Host "Permission already exists for AppId $AppId on $SiteUrl. Updating to $Permissions..."
    # Change role on existing permission
    Set-PnPAzureADAppSitePermission -Site $SiteUrl -PermissionId $existing.Id -Permissions $Permissions | Out-Null
}
else {
    Write-Host "Granting $Permissions permission to AppId $AppId on $SiteUrl..."
    Grant-PnPAzureADAppSitePermission `
        -Site $SiteUrl `
        -AppId $AppId `
        -DisplayName $DisplayName `
        -Permissions $Permissions | Out-Null
}

# Show resulting permissions
Write-Host "Current app permissions on site:"
Get-PnPAzureADAppSitePermission -Site $SiteUrl

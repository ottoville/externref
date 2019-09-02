# The File Copy step (which uses AzCopy) has /SetContentType but it ignores a bunch of types and messes 
# up the content type of others. This script fixes the common ones. 

$StorageAccountName = "terrasim" # i.e. WolfTrackerStorage
# If you're using VSTS I would strongly suggest using Key Vault to store and retrieve the key. Keep secrets out of your code!
$StorageAccountKey = "o0Rq8IDduL+VYNQBSHAqh/5T8KHXemI5FOeGcSB2bgzBF4pKeIJ+e+X1TMGdFDSmkwq5zDV263SbjqAh5EC9dA==" 

$Context = New-AzureStorageContext -StorageAccountName $StorageAccountName -StorageAccountKey $StorageAccountKey
$Blobs = Get-AzureStorageBlob -Context $Context -Container '$web'

foreach ($Blob in $Blobs) 
{  
    $Extn = [IO.Path]::GetExtension($Blob.Name)
    $ContentType = ""
    
    # For some reason it sets .js to "application/x-javascript". If there are any other wierd types of content
    # types missing altogether, add them below
    switch ($Extn) {
        ".json" { $ContentType = "application/json" }
        ".js" { $ContentType = "application/javascript" }
        ".svg" { $ContentType = "image/svg+xml" }
".wasm" { $ContentType = "application/wasm" }
        Default { $ContentType = "" }
    }

    if ($ContentType -ne "") {
        $CloudBlockBlob = [Microsoft.WindowsAzure.Storage.Blob.CloudBlockBlob] $Blob.ICloudBlob
        
        $CloudBlockBlob.Properties.ContentType = $ContentType 
        $CloudBlockBlob.SetProperties()    
    }
}
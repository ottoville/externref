@description('Generated from /subscriptions/235f31bd-1e8d-42fa-853a-8610f202e58d/resourceGroups/terrasim-rg/providers/Microsoft.KeyVault/vaults/terraSim')
resource KeyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: 'terraSim'
  location: 'westeurope'
  tags: {}
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: '6bc047bf-c784-45d9-9016-d3cdb4d08f14'
    
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
      ipRules: []
      virtualNetworkRules: []
    }
    accessPolicies: [
      {
        tenantId: '6bc047bf-c784-45d9-9016-d3cdb4d08f14'
        objectId: 'f404da55-8692-485d-a0d9-d6c9e5c15027'
        permissions: {
          keys: []
          secrets: [
            'Get'
            'List'
          ]
          certificates: []
        }
      }
    ]
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: false
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enableRbacAuthorization: true
    provisioningState: 'Succeeded'
    publicNetworkAccess: 'Enabled'
  }
}
@description('Generated from /subscriptions/235f31bd-1e8d-42fa-853a-8610f202e58d/resourceGroups/terrasim-rg/providers/Microsoft.Web/staticSites/TerraSim')
resource SWA 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'TerraSim'
  location: 'West Europe'
  tags: {}
  properties: {
    repositoryUrl: 'https://dev.azure.com/terraSim/terrasim/_git/terrasim'
    branch: 'master'
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'DevOps'
    enterpriseGradeCdnStatus: 'Disabled'
    publicNetworkAccess: null
  }
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
}
resource secret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: KeyVault
  name: 'swakey'
  properties: {
    value: SWA.listSecrets().properties.apiKey
  }
}

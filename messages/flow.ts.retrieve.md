# summary
Display json.

# description
Display json document.

# flags.username.summary
Login username of the Salesforce org you want to connect to.

# flags.path.summary
The file of the flow you want displayed.

# flags.apiversion.summary
The file of the flow you want displayed.

# flags.outdir.summary
output directory.

# flags.locale.summary
locale of the document (en or ja).

# flags.nospinner.summary
specify if you want to hide spinner.

# error.paramNotFound
Flow API name is missing.

# error.flowNotFound
The flow is not found in the org.

# error.unsupportedFlow
The flow is unsupported.

# examples
- Say hello to the world:

  <%= config.bin %> <%= command.id %>

- Say hello to someone you know:

  <%= config.bin %> <%= command.id %> --name Astro

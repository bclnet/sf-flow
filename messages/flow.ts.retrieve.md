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

# flags.indir.summary
input directory.

# flags.outdir.summary
output directory.

# flags.locale.summary
locale of the document (en or ja).

# flags.nospinner.summary
specify if you want to hide spinner.

# flags.debug.summary
specify if you want debug information.

# flags.paranoid.summary
specify if you want paranoid flag.

# flags.force.summary
specify if you want force a paranoid build.

# error.paramNotFound
Flow API name is missing.

# error.flowNotFound
The flow is not found in the org.

# error.unsupportedFlow
The flow is unsupported.

# error.paranoidFlow
The flow is paranoid.

# examples
- Say hello to the world:

  <%= config.bin %> <%= command.id %>

- Say hello to someone you know:

  <%= config.bin %> <%= command.id %> --name Astro

const github = require("@actions/github");
const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");
const fs = require("fs");

async function run() {
  try {
    // get workflow inputs
    const tag_prefix = core.getInput(`tag_prefix`, { required: true });
    const owner = core.getInput(`owner`, { required: true });
    const repo = core.getInput(`repo`, { required: true }).split("/").slice(-1);
    const token = core.getInput("token", { required: true });
    const cargo_path = core.getInput("cargo", { required: true });
    const commit_sha = core.getInput("commit_sha", { required: true });

    const cargo_content = fs.readFileSync(cargo_path, "utf8").toString();

    let cargo_version_re = /version *= *"(?<version>[a-zA-Z0-9._-]+)"/u;
    let cargo_version_result = cargo_version_re.exec(cargo_content);
    let cargo_version = cargo_version_result.groups.version;

    core.info(`Found crate version ${cargo_version} in ${cargo_path}`);

    // check current tags for existing version
    const tag_name = `${tag_prefix}-v${cargo_version}`;
    const octokit = github.getOctokit(token);

    const tags = await octokit.rest.repos.listTags({
      owner: owner,
      repo: repo,
    });
    const does_tag_already_exist = tags.data.some((i) => i.name === tag_name);
    if (!does_tag_already_exist) {
      core.notice(`Found unreleased version ${cargo_version}`);
    }

    core.setOutput("version", cargo_version);
    core.setOutput("is_new_version", !does_tag_already_exist);
    core.setOutput("tag_name", tag_name);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

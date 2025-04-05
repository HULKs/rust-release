const github = require("@actions/github");
const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");
const fs = require("fs");

// most @actions toolkit packages have async methods
async function run() {
  core.info("Starting...");

  try {
    // get workflow inputs
    const title = core.getInput(`title`, { required: true });
    const dry_run = core.getInput(`dry_run`, { required: true });
    const owner = core.getInput(`owner`, { required: true });
    const repo = core.getInput(`repo`, { required: true }).split("/").slice(-1);
    const token = core.getInput("token", { required: true });
    const cargo_path = core.getInput("cargo", { required: true });
    const commit_sha = core.getInput("commit_sha", { required: true });

    core.info("Getting cargo file contents...");
    const cargo_content = fs.readFileSync(cargo_path, "utf8").toString();

    core.info("Getting crate version...");
    let cargo_version_re = /version *= *"(?<version>[a-zA-Z0-9._-]+)"/u;
    let cargo_version_result = cargo_version_re.exec(cargo_content);
    let cargo_version = cargo_version_result.groups.version;
    core.info(`Got crate version ${cargo_version}`);

    // check current tags for existing version
    const tag_name = `${title}-v${cargo_version}`;
    const octokit = github.getOctokit(token);

    const tags = await octokit.rest.repos.listTags({
      owner: owner,
      repo: repo,
    });
    const does_tag_already_exist = tags.data.some((i) => i.name === tag_name);

    if (does_tag_already_exist) {
      core.info(`Skipping: Tag ${tag_name} already exists`);
      core.notice(`Tag ${tag_name} already exists`);
    } else {
      core.info(`Creating tag ${tag_name}...`);
      if (dry_run === "false") {
        const { data: tagData } = await octokit.rest.git.createTag({
          owner: owner,
          repo: repo,
          tag: tag_name,
          message: tag_name,
          object: commit_sha,
          type: "commit",
        });

        const { data: refData } = await octokit.rest.git.createRef({
          owner: owner, // Replace with your GitHub username
          repo: repo, // Replace with your GitHub repository name
          ref: `refs/tags/${tag_name}`, // The tag ref to create
          sha: commit_sha, // The commit SHA that the tag points to
        });
      } else {
        core.info(`Would create tag ${tag_name}, but this is a dry run.`);
      }
      core.notice(`Created tag ${tag_name}`);
    }

    // output the crate version
    core.setOutput("version", cargo_version);
    core.setOutput("tag_name", tag_name);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

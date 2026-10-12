"""
Check Python style with ruff and JavaScript style with ESLint and Prettier.

EECS 485 Project 3
"""

import subprocess

import utils


def test_eslint():
    """Run eslint."""
    assert_no_prohibited_terms(
        "eslint-disable",
        "jQuery",
        "XMLHttpRequest",
        targets=(
            "chat485",
            "tests/cypress/e2e/test_student.cy.js",
        ),
    )
    subprocess.run(
        [
            "npx",
            "eslint",
            "--no-inline-config",
            "--config",
            str(utils.TEST_DIR / "testdata/eslint.config.js"),
            "chat485/js/",
            "tests/cypress/e2e/test_student.cy.js",
        ],
        check=True,
    )


def test_prettier():
    """Run Prettier."""
    assert_no_prohibited_terms(
        "prettier-ignore",
        targets=(
            "chat485",
            "tests/cypress/e2e/test_student.cy.js",
        ),
    )
    subprocess.run(
        [
            "npx",
            "prettier",
            "--check",
            "--config",
            str(utils.TEST_DIR / "testdata/prettierrc.json"),
            "--ignore-path",
            str(utils.TEST_DIR / "testdata/prettierignore"),
            "chat485/js",
            "tests/cypress/e2e/test_student.cy.js",
        ],
        check=True,
    )


def test_ruff_check():
    """Run ruff check."""
    # Carve out the ARG001 (unused-argument) suppression for Flask URL-bound
    # parameters, e.g. the SPA-shell view that accepts <conversation_uuid>
    # only because Flask binds it from the route.  Other suppressions are
    # prohibited; refactor the code instead.
    assert_no_prohibited_terms("noqa", allow=("noqa: ARG001",))
    subprocess.run(
        [
            "ruff",
            "check",
            "--config",
            str(utils.TEST_DIR / "testdata/ruff.toml"),
            "--no-respect-gitignore",
            "chat485",
        ],
        check=True,
    )


def test_ruff_format():
    """Run ruff format --check."""
    # No formatter inline suppressions allowed: refactor the code instead of
    # silencing the formatter.
    assert_no_prohibited_terms("fmt:", "yapf:")
    subprocess.run(
        [
            "ruff",
            "format",
            "--check",
            "--config",
            str(utils.TEST_DIR / "testdata/ruff.toml"),
            "--no-respect-gitignore",
            "chat485",
        ],
        check=True,
    )


def assert_no_prohibited_terms(*terms, allow=(), targets=("chat485",)):
    """Check for prohibited terms before testing style.

    Each `term` is searched for as a case-insensitive literal substring in
    `targets` (source files under `chat485` by default). Lines containing any
    substring listed in `allow` are exempt -- use this to carve out narrow,
    documented exceptions (e.g., the ARG001 suppression for unused Flask URL
    parameters).
    """
    for term in terms:
        completed_process = subprocess.run(
            [
                "grep",
                "-r",
                "-n",
                "-i",
                term,
                "--include=*.py",
                "--include=*.jsx",
                "--include=*.js",
                "--include=*.tsx",
                "--include=*.ts",
                "--exclude=__init__.py",
                "--exclude=bundle.js",
                "--exclude=*node_modules/*",
                *targets,
            ],
            check=False,  # We filter the output ourselves below.
            stdout=subprocess.PIPE,
            text=True,
        )

        # Drop any line that matches an allowed-exception substring.  When
        # `allow` is empty (the common case) this is just splitlines().
        bad_lines = [
            line
            for line in completed_process.stdout.splitlines()
            if not any(allowed in line for allowed in allow)
        ]

        assert not bad_lines, f"The term '{term}' is prohibited.\n" + "\n".join(
            bad_lines
        )

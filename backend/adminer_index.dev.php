<?php
namespace docker {
        function default_credentials(): array {
                return array(
                        'driver'   => $_ENV['ADMINER_DEFAULT_DRIVER'] ?: 'server',
                        'server'   => $_ENV['ADMINER_DEFAULT_SERVER'] ?: 'db',
                        'username' => $_ENV['ADMINER_DEFAULT_USERNAME'] ?: '',
                        'password' => $_ENV['ADMINER_DEFAULT_PASSWORD'] ?: '',
                        'db'       => $_ENV['ADMINER_DEFAULT_DB'] ?: '',
                );
        }

        /**
         * On a fresh page load (nothing in $_GET yet), sends the browser straight to
         * the URL a normal login submission would land on. This has to be a real
         * redirect rather than just faking $_GET server-side: further down,
         * adminer.php canonicalizes the URL for the driver's schema/namespace (e.g.
         * Postgres) by pattern-matching against the *actual* request URI, so if the
         * query string we claim via $_GET doesn't match what the browser really
         * sent, that canonicalization redirects right back to the same bare URL
         * forever.
         */
        function redirect_to_login_url(): void {
                $creds = default_credentials();
                if ($creds['username'] === '') {
                        return;
                }

                $params = array($creds['driver'] => $creds['server'], 'username' => $creds['username']);
                if ($creds['db'] !== '') {
                        $params['db'] = $creds['db'];
                }

                header('Location: ?' . http_build_query($params));
                exit;
        }

        /**
         * Whether the current request's query string is exactly the one
         * redirect_to_login_url() sends browsers to -- i.e. it's safe to supply the
         * configured password for it.
         */
        function is_default_login_request(): bool {
                $creds = default_credentials();
                return $creds['username'] !== ''
                        && ($_GET[$creds['driver']] ?? null) === $creds['server']
                        && ($_GET['username'] ?? null) === $creds['username'];
        }

        /**
         * Adminer connects automatically whenever `$_GET['username']` is set and a
         * password is already sitting in `$_SESSION['pwds'][driver][server][username]`
         * -- that's how a "remember me" cookie logs a returning browser back in
         * without resubmitting the login form, and unlike the form POST it isn't
         * gated behind a CSRF token, so we can seed it directly.
         *
         * This has to run after adminer.php's own top-level code has started its
         * "adminer_sid" session (starting one ourselves any earlier makes this PHP
         * setup send response headers immediately, which then breaks every header()
         * call adminer.php makes afterwards, including its login/canonicalization
         * redirects). Calling this from adminer_object() below is late enough: that
         * hook only fires once something calls adminer()->credentials(), which
         * happens well after adminer.php's own session_start().
         */
        function seed_session_password(): void {
                if (!is_default_login_request() || \session_status() !== \PHP_SESSION_ACTIVE) {
                        return;
                }

                $creds = default_credentials();
                $_SESSION['pwds'][$creds['driver']][$creds['server']][$creds['username']] = $creds['password'];
        }

        function adminer_object() {
                seed_session_password();

                /**
                 * Fallback for when the auto-login above didn't end up connected
                 * (wrong password, database not up yet, ...): Adminer already echoes
                 * auth[driver]/auth[server]/auth[username]/auth[db] back from $_GET
                 * on the login form, so the only field left blank is the password
                 * (Adminer never echoes that one back, for good reason) -- prefill
                 * it too so the form is fully filled in and just needs Enter.
                 */
                final class PrefillPasswordPlugin extends \Adminer\Plugin {
                        public function __construct(
                                private \Adminer\Adminer $adminer
                        ) { }

                        public function loginFormField(...$args): string {
                                return (function (...$args): string {
                                        $field = $this->loginFormField(...$args);

                                        if ($args[0] !== 'password') {
                                                return $field;
                                        }

                                        return \str_replace(
                                                "name=\"auth[password]\"",
                                                \sprintf(
                                                        "name=\"auth[password]\" value=\"%s\"",
                                                        \htmlspecialchars(default_credentials()['password'], \ENT_QUOTES),
                                                ),
                                                $field,
                                        );
                                })->call($this->adminer, ...$args);
                        }
                }

                $plugins = [];
                foreach (glob('plugins-enabled/*.php') as $plugin) {
                        $plugins[] = require($plugin);
                }

                $adminer = new \Adminer\Plugins($plugins);

                (function () {
                        $last = &$this->hooks['loginFormField'][\array_key_last($this->hooks['loginFormField'])];
                        if ($last instanceof \Adminer\Adminer) {
                                $prefillPasswordPlugin = new PrefillPasswordPlugin($last);
                                $this->plugins[] = $prefillPasswordPlugin;
                                $last = $prefillPasswordPlugin;
                        }
                })->call($adminer);

                return $adminer;
        }
}

namespace {
        if (basename($_SERVER['DOCUMENT_URI'] ?? $_SERVER['REQUEST_URI']) === 'adminer.css' && is_readable('adminer.css')) {
                header('Content-Type: text/css');
                readfile('adminer.css');
                exit;
        }

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET' && !$_GET) {
                \docker\redirect_to_login_url();
        }

        function adminer_object() {
                return \docker\adminer_object();
        }

        require('adminer.php');
}

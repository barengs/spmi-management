#!/bin/sh

set -u

run_suite() {
    suite_name="$1"
    shift

    printf '\n========================================\n'
    printf 'Running %s Test Suite\n' "$suite_name"
    printf '========================================\n'

    if "$@"; then
        printf '\n[PASS] %s Test Suite\n' "$suite_name"
        return 0
    fi

    printf '\n[FAIL] %s Test Suite\n' "$suite_name"
    return 1
}

overall_status=0

php artisan config:clear --ansi || exit 1

run_suite "Functional" php artisan test --testsuite=Functional || overall_status=1
run_suite "Integration" php artisan test --testsuite=Integration || overall_status=1
run_suite "System" php artisan test --testsuite=System || overall_status=1

printf '\n========================================\n'
printf 'Test Suite Summary\n'
printf '========================================\n'

if [ "$overall_status" -eq 0 ]; then
    printf '[PASS] Functional, Integration, and System suites all passed.\n'
else
    printf '[FAIL] One or more suites failed. Check the sections above.\n'
fi

exit "$overall_status"

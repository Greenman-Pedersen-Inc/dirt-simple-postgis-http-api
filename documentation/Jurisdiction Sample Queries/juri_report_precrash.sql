    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_pedestrians where acc_mun_cty_co = '01' AND acc_mun_mu = '01'
    and acc_year >= 2015 and acc_year <= 2019),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM state_trends.ped_precrash_state WHERE year >= 2015 AND year <= 2019)

    SELECT code,
        CASE
                WHEN juriCount > 0 THEN juriCount
                ELSE 0
        END AS juriCount,
        ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference FROM (        SELECT State.type AS Code, JuriCount, StateCount AS StateCount FROM
        (
            SELECT * FROM (
                SELECT (CASE
                WHEN pre_crash_type IS NULL THEN '-20'
                ELSE pre_crash_type
                END), count(*) AS JuriCount
                FROM ard_pedestrians
                WHERE acc_mun_cty_co = '01' AND acc_mun_mu = '01' AND (acc_year >= 2015 and acc_year <= 2019)
                GROUP BY pre_crash_type ORDER BY pre_crash_type
            ) AS preCrashCount
            LEFT JOIN
            state_trends.crash_pre_crash_action ON pre_crash_type = code ORDER BY pre_crash_type
        ) AS Juri
        RIGHT JOIN
        (
            SELECT code, type, SUM(statecount) AS StateCount FROM state_trends.ped_precrash_state
            WHERE year >= 2015 AND year <= 2019 GROUP BY code, type ORDER BY code
        ) AS State
        ON Juri.code = State.code
    GROUP BY State.type, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
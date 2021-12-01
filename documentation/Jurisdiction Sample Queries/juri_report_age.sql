    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_pedestrians where acc_mun_cty_co = '01' AND acc_mun_mu = '01'  
    and acc_year >= 2015 and acc_year <= 2019),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM state_trends.ped_age_state WHERE year >= 2015 AND year <= 2019)

    SELECT code,
        CASE
                WHEN juriCount > 0 THEN juriCount
                ELSE 0
        END AS juriCount,
        ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
    (
        SELECT AgeBucket AS Code, count(*) AS JuriCount FROM (
            SELECT
            CASE
            WHEN age < 10 THEN '0-9'
            WHEN age >= 10 and age < 20 THEN '10-19'
            WHEN age >= 20 and age < 30 THEN '20-29'
            WHEN age >= 30 and age < 40 THEN '30-39'
            WHEN age >= 40 and age < 50 THEN '40-49'
            WHEN age >= 50 and age < 60 THEN '50-59'
            WHEN age >= 60 and age < 70 THEN '60-69'
            WHEN age >= 70 THEN '70+'
            ELSE 'Unknown'
            END
            AS AgeBucket
            FROM ard_pedestrians where acc_mun_cty_co = '01' AND acc_mun_mu = '01' and acc_year >= 2015 and acc_year <= 2019
        ) AS ageData
        GROUP BY AgeBucket ORDER BY AgeBucket
    ) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM state_trends.ped_age_state
    WHERE year >= 2015 AND year <= 2019 GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
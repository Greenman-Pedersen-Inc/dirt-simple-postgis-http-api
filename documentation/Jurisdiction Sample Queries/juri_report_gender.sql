    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_pedestrians_partition where acc_mun_cty_co = '01' AND acc_mun_mu = '01'
    and acc_year >= 2015 and acc_year <= 2019),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM state_trends.ped_gender_state WHERE year >= 2015 AND year <= 2019)

    SELECT code,
        CASE
                WHEN juriCount > 0 THEN juriCount
                ELSE 0
        END AS juriCount,
        JuriTotal, ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
    (SELECT (CASE sex
                WHEN 'F' THEN 'Female'
                WHEN 'M' THEN 'Male'
                ELSE 'Unknown'
                END)
                AS code, count(*) as JuriCount
                FROM ard_pedestrians_partition where acc_mun_cty_co = '01' AND acc_mun_mu = '01' and acc_year >= 2015 and acc_year <= 2019
                group by sex order by sex) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM state_trends.ped_gender_state
    WHERE year >= 2015 AND year <= 2019 GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;